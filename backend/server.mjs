import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { recognizeProduct } from './product-vision.mjs';
import { analyzePurchase } from './purchase-analysis.mjs';

const categories = ['화장품', '영양제', '의약품', '생활용품'];
const maxImageBytes = 5 * 1024 * 1024;
const databasePath = process.env.DASSEM_DB_PATH
  ? resolve(process.env.DASSEM_DB_PATH)
  : fileURLToPath(new URL('./.data/products.sqlite', import.meta.url));
const dataDirectory = resolve(databasePath, '..');
const imageDirectory = resolve(dataDirectory, 'images');
mkdirSync(imageDirectory, { recursive: true });
const database = new DatabaseSync(databasePath, { timeout: 5000 });
database.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    openedAt TEXT,
    expiresAt TEXT,
    createdAt TEXT NOT NULL
  ) STRICT
`);

// 기존 SQLite 파일을 지우지 않고 새 필드를 추가합니다.
const productColumns = new Set(database.prepare('PRAGMA table_info(products)').all().map((column) => column.name));
if (!productColumns.has('brand')) database.exec('ALTER TABLE products ADD COLUMN brand TEXT');
if (!productColumns.has('imageUri')) database.exec('ALTER TABLE products ADD COLUMN imageUri TEXT');
if (!productColumns.has('status')) database.exec("ALTER TABLE products ADD COLUMN status TEXT NOT NULL DEFAULT 'owned'");
if (!productColumns.has('completedAt')) database.exec('ALTER TABLE products ADD COLUMN completedAt TEXT');

database.exec(`
  CREATE TABLE IF NOT EXISTS activity_records (
    id TEXT PRIMARY KEY NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('hold', 'done')),
    productId TEXT,
    name TEXT NOT NULL,
    category TEXT,
    match TEXT,
    query TEXT,
    createdAt TEXT NOT NULL
  ) STRICT
`);

const insert = database.prepare(`
  INSERT INTO products (id, name, brand, category, quantity, openedAt, expiresAt, imageUri, createdAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const list = database.prepare('SELECT * FROM products ORDER BY createdAt DESC, rowid DESC');
const findById = database.prepare('SELECT * FROM products WHERE id = ?');
const update = database.prepare(`
  UPDATE products
  SET name = ?, brand = ?, category = ?, quantity = ?, openedAt = ?, expiresAt = ?, imageUri = ?
  WHERE id = ?
`);
const remove = database.prepare('DELETE FROM products WHERE id = ?');
const listOwned = database.prepare("SELECT * FROM products WHERE status = 'owned' ORDER BY createdAt DESC, rowid DESC");
const setProductStatus = database.prepare('UPDATE products SET status = ?, completedAt = ? WHERE id = ?');
const listRecords = database.prepare('SELECT * FROM activity_records ORDER BY createdAt DESC, rowid DESC');
const insertRecord = database.prepare(`
  INSERT INTO activity_records (id, type, productId, name, category, match, query, createdAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
const removeDoneRecords = database.prepare("DELETE FROM activity_records WHERE type = 'done' AND productId = ?");
const removeProductRecords = database.prepare('DELETE FROM activity_records WHERE productId = ?');

function transaction(work) {
  database.exec('BEGIN IMMEDIATE');
  try {
    const result = work();
    database.exec('COMMIT');
    return result;
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

function send(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
}

function sendImage(response, path) {
  if (!existsSync(path)) return send(response, 404, { error: 'Image not found' });
  const types = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
  response.writeHead(200, {
    'Content-Type': types[extname(path).toLowerCase()] ?? 'application/octet-stream',
    'Cache-Control': 'public, max-age=31536000, immutable',
  });
  response.end(readFileSync(path));
}

function publicProduct({ openedAt, expiresAt, completedAt, brand, imageUri, ...product }) {
  return {
    ...product,
    openedAt: openedAt ?? undefined,
    expiresAt: expiresAt ?? undefined,
    completedAt: completedAt ?? undefined,
    brand: brand ?? undefined,
    imageUri: imageUri ?? undefined,
  };
}

function publicRecord({ category, match, query, productId, ...record }) {
  return {
    ...record,
    productId: productId ?? undefined,
    category: category ?? undefined,
    match: match ?? undefined,
    query: query ?? undefined,
  };
}

function optionalDate(value, field) {
  if (value === undefined || value === '') return undefined;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T00:00:00Z`);
    if (!Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value) return value;
  }
  throw new Error(`${field} must be a valid YYYY-MM-DD date`);
}

function optionalText(value, field, maxLength) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || value.trim().length > maxLength) throw new Error(`${field} is invalid`);
  return value.trim();
}

function parseProduct(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Expected a JSON object');
  const { name, category, quantity = 1 } = body;
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 200) {
    throw new Error('name must contain 1 to 200 characters');
  }
  if (!categories.includes(category)) throw new Error('Invalid category');
  if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error('quantity must be a positive integer');
  return {
    id: randomUUID(),
    name: name.trim(),
    brand: optionalText(body.brand, 'brand', 200),
    category,
    quantity,
    openedAt: optionalDate(body.openedAt, 'openedAt'),
    expiresAt: optionalDate(body.expiresAt, 'expiresAt'),
    imageUri: optionalText(body.imageUri, 'imageUri', 2_000),
    createdAt: new Date().toISOString(),
  };
}

function imageExtension(contentType) {
  if (contentType === 'image/png') return '.png';
  if (contentType === 'image/webp') return '.webp';
  if (contentType === 'image/jpeg' || contentType === 'image/jpg') return '.jpg';
  return undefined;
}

function saveImage(buffer, contentType) {
  if (!buffer.length || buffer.length > maxImageBytes) throw new Error('Image must be 5MB or smaller');
  const extension = imageExtension(contentType);
  if (!extension) throw new Error('Only JPEG, PNG and WebP images are supported');
  const filename = `${randomUUID()}${extension}`;
  writeFileSync(resolve(imageDirectory, filename), buffer, { flag: 'wx' });
  return filename;
}

function imageUrl(filename) {
  return `/api/images/${filename}`;
}

async function saveRequestedImage(body) {
  if (typeof body?.image === 'string') {
    const match = /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(body.image);
    if (!match) throw new Error('Invalid image data');
    return saveImage(Buffer.from(match[2], 'base64'), match[1]);
  }
  if (typeof body?.url === 'string') {
    let url;
    try { url = new URL(body.url); } catch { throw new Error('Invalid image URL'); }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Invalid image URL');
    const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error('Recommended image could not be downloaded');
    const declaredSize = Number(response.headers.get('content-length') ?? 0);
    if (declaredSize > maxImageBytes) throw new Error('Image must be 5MB or smaller');
    const contentType = response.headers.get('content-type')?.split(';')[0].toLowerCase();
    return saveImage(Buffer.from(await response.arrayBuffer()), contentType);
  }
  throw new Error('Choose an image first');
}

async function searchKakaoProductImages(query) {
  const apiKey = process.env.KAKAO_REST_API_KEY?.trim();
  if (!apiKey) return undefined;
  const text = typeof query === 'string' ? query.trim() : '';
  if (text.length < 2 || text.length > 200) return { configured: true, images: [] };

  const endpoint = new URL('https://dapi.kakao.com/v2/search/image');
  endpoint.searchParams.set('query', text);
  endpoint.searchParams.set('sort', 'accuracy');
  endpoint.searchParams.set('size', '12');
  const response = await fetch(endpoint, {
    headers: { Authorization: `KakaoAK ${apiKey}` },
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(payload.documents)) {
    throw new Error(`Kakao image search failed (${response.status})`);
  }

  const images = [];
  const seen = new Set();
  for (const item of payload.documents) {
    const imageUrl = typeof item?.image_url === 'string' ? item.image_url : '';
    const thumbnail = typeof item?.thumbnail_url === 'string' ? item.thumbnail_url : imageUrl;
    if (!imageUrl || !thumbnail || seen.has(imageUrl)) continue;
    let image;
    let preview;
    try {
      image = new URL(imageUrl);
      preview = new URL(thumbnail);
    } catch {
      continue;
    }
    if (!['http:', 'https:'].includes(image.protocol) || preview.protocol !== 'https:') continue;
    seen.add(imageUrl);
    images.push({
      url: imageUrl,
      thumbnail,
      title: item.display_sitename || '인터넷에서 찾은 제품 사진',
    });
    if (images.length === 3) break;
  }
  return { configured: true, provider: 'Kakao', images };
}

async function searchVisionProductImages(image) {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY?.trim();
  if (!apiKey || typeof image !== 'string') return undefined;
  const match = /^data:image\/(?:jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(image);
  if (!match) return undefined;

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: match[1] },
          features: [{ type: 'WEB_DETECTION', maxResults: 10 }],
        }],
      }),
      signal: AbortSignal.timeout(15_000),
    },
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) throw new Error(`Google Web Detection failed (${response.status})`);
  const web = payload.responses?.[0]?.webDetection;
  const title = web?.bestGuessLabels?.[0]?.label ?? '웹에서 찾은 유사 제품 사진';
  const candidates = [
    ...(web?.fullMatchingImages ?? []),
    ...(web?.partialMatchingImages ?? []),
    ...(web?.visuallySimilarImages ?? []),
  ];
  const seen = new Set();
  const images = [];
  for (const candidate of candidates) {
    if (typeof candidate?.url !== 'string' || seen.has(candidate.url)) continue;
    let url;
    try { url = new URL(candidate.url); } catch { continue; }
    if (url.protocol !== 'https:') continue;
    seen.add(candidate.url);
    images.push({ url: candidate.url, thumbnail: candidate.url, title });
    if (images.length === 3) break;
  }
  return { configured: true, provider: 'Google Vision', images };
}

async function searchProductImages({ query, image }) {
  const kakao = await searchKakaoProductImages(query);
  if (kakao) return kakao;
  const vision = await searchVisionProductImages(image);
  if (vision) return vision;
  return { configured: false, images: [] };
}

async function readJson(request, response, maxBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > maxBytes) {
      response.setHeader('Connection', 'close');
      send(response, 413, { error: 'Request body too large' });
      return undefined;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    send(response, 400, { error: 'Invalid JSON' });
    return undefined;
  }
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const path = url.pathname;
    const imageMatch = /^\/api\/images\/([0-9a-f-]+\.(?:jpg|jpeg|png|webp))$/i.exec(path);
    const doneMatch = /^\/api\/products\/([0-9a-f-]+)\/done$/i.exec(path);
    const productMatch = /^\/api\/products\/([0-9a-f-]+)$/i.exec(path);
    const knownPath = path === '/api/products' || path === '/api/products/recognize' ||
      path === '/api/purchase-analysis' || path === '/api/records' || path === '/api/holds' ||
      path === '/api/products/images' || path === '/api/products/images/search' ||
      imageMatch || doneMatch || productMatch;
    if (!knownPath) return send(response, 404, { error: 'Not found' });

    const origin = request.headers.origin;
    if (origin) {
      if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return send(response, 403, { error: 'Origin not allowed' });
      }
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Vary', 'Origin');
    }
    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      return response.end();
    }

    if (request.method === 'GET' && imageMatch) {
      return sendImage(response, resolve(imageDirectory, imageMatch[1]));
    }
    if (request.method === 'GET' && path === '/api/products') {
      const products = list.all().map(publicProduct);
      return send(response, 200, { products });
    }
    if (request.method === 'GET' && path === '/api/records') {
      return send(response, 200, { records: listRecords.all().map(publicRecord) });
    }
    if (request.method === 'DELETE' && doneMatch) {
      const existing = findById.get(doneMatch[1]);
      if (!existing) return send(response, 404, { error: 'Product not found' });
      transaction(() => {
        setProductStatus.run('owned', null, doneMatch[1]);
        removeDoneRecords.run(doneMatch[1]);
      });
      return send(response, 200, {
        product: publicProduct(findById.get(doneMatch[1])),
        records: listRecords.all().map(publicRecord),
      });
    }
    if (request.method === 'DELETE' && productMatch) {
      const existing = findById.get(productMatch[1]);
      if (!existing) return send(response, 404, { error: 'Product not found' });
      transaction(() => {
        removeProductRecords.run(productMatch[1]);
        remove.run(productMatch[1]);
      });
      return send(response, 200, { deleted: true });
    }
    if (request.method !== 'POST' && request.method !== 'PATCH') {
      response.setHeader('Allow', 'GET, POST, PATCH, DELETE, OPTIONS');
      return send(response, 405, { error: 'Method not allowed' });
    }

    const largeBody = path === '/api/products/recognize' || path === '/api/products/images' ||
      path === '/api/products/images/search';
    const body = await readJson(request, response, largeBody ? maxImageBytes + 1024 : 16_384);
    if (body === undefined) return;

    if (request.method === 'POST' && doneMatch) {
      const existing = findById.get(doneMatch[1]);
      if (!existing) return send(response, 404, { error: 'Product not found' });
      const completedAt = new Date().toISOString();
      transaction(() => {
        setProductStatus.run('done', completedAt, doneMatch[1]);
        removeDoneRecords.run(doneMatch[1]);
        insertRecord.run(randomUUID(), 'done', doneMatch[1], existing.name, existing.category,
          null, null, completedAt);
      });
      return send(response, 200, {
        product: publicProduct(findById.get(doneMatch[1])),
        records: listRecords.all().map(publicRecord),
      });
    }
    if (request.method === 'POST' && path === '/api/holds') {
      const productId = typeof body?.productId === 'string' ? body.productId : '';
      const existing = findById.get(productId);
      if (!existing || existing.status === 'done') {
        return send(response, 404, { error: 'Owned product not found' });
      }
      const verdict = body?.verdict === 'same' ? 'same' : body?.verdict === 'similar' ? 'similar' : undefined;
      const query = optionalText(body?.query, 'query', 200);
      if (!verdict) return send(response, 400, { error: 'verdict is invalid' });
      const createdAt = new Date().toISOString();
      insertRecord.run(randomUUID(), 'hold', productId, existing.name, existing.category,
        verdict, query ?? null, createdAt);
      return send(response, 201, { records: listRecords.all().map(publicRecord) });
    }

    if (request.method === 'PATCH' && productMatch) {
      const existing = findById.get(productMatch[1]);
      if (!existing) return send(response, 404, { error: 'Product not found' });
      let changed;
      try {
        changed = parseProduct({
          name: body?.name ?? existing.name,
          brand: body?.brand ?? existing.brand,
          category: body?.category ?? existing.category,
          quantity: body?.quantity ?? existing.quantity,
          openedAt: body?.openedAt ?? existing.openedAt ?? undefined,
          expiresAt: body?.expiresAt ?? existing.expiresAt ?? undefined,
          imageUri: body?.imageUri ?? existing.imageUri,
        });
      } catch (error) {
        return send(response, 400, { error: error.message });
      }
      update.run(changed.name, changed.brand ?? null, changed.category, changed.quantity,
        changed.openedAt ?? null, changed.expiresAt ?? null, changed.imageUri ?? null, productMatch[1]);
      return send(response, 200, { product: publicProduct(findById.get(productMatch[1])) });
    }
    if (request.method === 'PATCH') return send(response, 404, { error: 'Not found' });

    if (path === '/api/products/recognize') {
      const { status, result } = await recognizeProduct(body?.image, categories);
      return send(response, status, result);
    }
    if (path === '/api/purchase-analysis') {
      const products = listOwned.all().map(publicProduct);
      const { status, result } = await analyzePurchase(body?.query, body?.purpose, products);
      return send(response, status, result);
    }
    if (path === '/api/products/images/search') {
      try {
        return send(response, 200, await searchProductImages({ query: body?.query, image: body?.image }));
      } catch (error) {
        console.error(error);
        return send(response, 502, { error: '인터넷에서 제품 사진을 찾지 못했어요.' });
      }
    }
    if (path === '/api/products/images') {
      try {
        const filename = await saveRequestedImage(body);
        return send(response, 201, { imageUri: imageUrl(filename) });
      } catch (error) {
        return send(response, 400, { error: error.message });
      }
    }
    if (path !== '/api/products') return send(response, 404, { error: 'Not found' });

    let product;
    try {
      product = parseProduct(body);
    } catch (error) {
      return send(response, 400, { error: error.message });
    }
    insert.run(product.id, product.name, product.brand ?? null, product.category, product.quantity,
      product.openedAt ?? null, product.expiresAt ?? null, product.imageUri ?? null, product.createdAt);
    send(response, 201, { product });
  } catch (error) {
    console.error(error);
    if (!response.destroyed && !response.headersSent) send(response, 500, { error: 'Internal server error' });
  }
});

const host = process.env.DASSEM_HOST ?? '127.0.0.1';
server.listen(Number(process.env.DASSEM_PORT ?? 3001), host, () => {
  console.log(`Products API listening on ${host}:${server.address().port}`);
});
