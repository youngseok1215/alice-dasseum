import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { fetchWithRetry } from './http-util.mjs';
import { recognizeProduct } from './product-vision.mjs';
import { analyzePurchase } from './purchase-analysis.mjs';
import { downloadImage, DownloadError, sniffImageType } from './safe-download.mjs';

const categories = ['화장품', '영양제', '의약품', '생활용품'];
const maxImageBytes = 5 * 1024 * 1024;
const databasePath = process.env.DASSEM_DB_PATH
  ? resolve(process.env.DASSEM_DB_PATH)
  : fileURLToPath(new URL('./.data/products.sqlite', import.meta.url));
const dataDirectory = resolve(databasePath, '..');
const imageDirectory = resolve(dataDirectory, 'images');
mkdirSync(imageDirectory, { recursive: true });
const databaseExisted = existsSync(databasePath);
const database = new DatabaseSync(databasePath, { timeout: 5000 });
console.log(`[db] ${databaseExisted ? '기존 DB 사용' : '새 DB 생성'}: ${databasePath}`);
console.log(`[db] 사진 저장 폴더: ${imageDirectory}`);
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
const columnMigrations = [
  ['brand', 'ALTER TABLE products ADD COLUMN brand TEXT'],
  ['imageUri', 'ALTER TABLE products ADD COLUMN imageUri TEXT'],
  ['status', "ALTER TABLE products ADD COLUMN status TEXT NOT NULL DEFAULT 'owned'"],
  ['completedAt', 'ALTER TABLE products ADD COLUMN completedAt TEXT'],
  ['memo', 'ALTER TABLE products ADD COLUMN memo TEXT'],
];
const addedColumns = [];
for (const [column, sql] of columnMigrations) {
  if (productColumns.has(column)) continue;
  database.exec(sql);
  addedColumns.push(column);
}
console.log(addedColumns.length
  ? `[db] 마이그레이션: products 테이블에 ${addedColumns.join(', ')} 열 추가 (기존 데이터 유지)`
  : '[db] 마이그레이션: products 테이블 최신 상태');
const hadActivityTable = Boolean(database.prepare(
  "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'activity_records'",
).get());

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
if (!hadActivityTable) console.log('[db] 마이그레이션: activity_records 테이블 생성 (다씀·구매 보류 기록)');
console.log(`[db] 제품 ${database.prepare('SELECT COUNT(*) AS n FROM products').get().n}개, 기록 ${database.prepare('SELECT COUNT(*) AS n FROM activity_records').get().n}개`);

const insert = database.prepare(`
  INSERT INTO products (id, name, brand, category, quantity, openedAt, expiresAt, imageUri, memo, createdAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const list = database.prepare('SELECT * FROM products ORDER BY createdAt DESC, rowid DESC');
const findById = database.prepare('SELECT * FROM products WHERE id = ?');
const update = database.prepare(`
  UPDATE products
  SET name = ?, brand = ?, category = ?, quantity = ?, openedAt = ?, expiresAt = ?, imageUri = ?, memo = ?
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
const countImageReferences = database.prepare(
  "SELECT COUNT(*) AS n FROM products WHERE imageUri = ? OR imageUri LIKE '%' || ?",
);

/** `/api/images/<파일>` 또는 그 절대 주소에서 서버에 저장된 파일 이름을 꺼냅니다. 외부 URL이면 undefined. */
function localImageFile(imageUri) {
  if (typeof imageUri !== 'string') return undefined;
  return /(?:^|\/\/[^/]+)\/api\/images\/([0-9a-f-]+\.(?:jpg|jpeg|png|webp))$/i.exec(imageUri)?.[1];
}

/** 어떤 제품도 더 이상 참조하지 않는 로컬 사진만 지웁니다. 다른 제품이 같은 사진을 쓰면 남깁니다. */
function removeImageIfUnused(imageUri) {
  const file = localImageFile(imageUri);
  if (!file) return;
  const suffix = `/api/images/${file}`;
  if (countImageReferences.get(suffix, suffix).n > 0) return;
  try {
    unlinkSync(resolve(imageDirectory, file));
    console.log(`[images] 사용하지 않는 사진 삭제: ${file}`);
  } catch (error) {
    if (error?.code !== 'ENOENT') console.warn('[images] 사진 삭제 실패:', file, error?.code ?? error?.name);
  }
}

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
  if (!existsSync(path)) return send(response, 404, { error: '사진을 찾을 수 없어요.' });
  const types = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
  response.writeHead(200, {
    'Content-Type': types[extname(path).toLowerCase()] ?? 'application/octet-stream',
    'Cache-Control': 'public, max-age=31536000, immutable',
  });
  response.end(readFileSync(path));
}

function publicProduct({ openedAt, expiresAt, completedAt, brand, imageUri, memo, ...product }) {
  return {
    ...product,
    openedAt: openedAt ?? undefined,
    expiresAt: expiresAt ?? undefined,
    completedAt: completedAt ?? undefined,
    brand: brand ?? undefined,
    imageUri: imageUri ?? undefined,
    memo: memo ?? undefined,
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
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T00:00:00Z`);
    if (!Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value) return value;
  }
  throw new Error(`${field === 'openedAt' ? '개봉일' : '사용기한'} 날짜 형식이 올바르지 않아요.`);
}

function optionalText(value, field, maxLength) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || value.trim().length > maxLength) {
    const label = { brand: '브랜드', memo: '메모', imageUri: '사진 주소', query: '검색어' }[field] ?? field;
    throw new Error(`${label}는 ${maxLength}자 이내로 입력해 주세요.`);
  }
  return value.trim();
}

function parseProduct(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('요청 형식이 올바르지 않아요.');
  const { name, category, quantity = 1 } = body;
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 200) {
    throw new Error('제품명은 1~200자로 입력해 주세요.');
  }
  if (!categories.includes(category)) throw new Error('카테고리를 선택해 주세요.');
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 999) throw new Error('수량은 1~999개로 입력해 주세요.');
  return {
    id: randomUUID(),
    name: name.trim(),
    brand: optionalText(body.brand, 'brand', 200),
    category,
    quantity,
    openedAt: optionalDate(body.openedAt, 'openedAt'),
    expiresAt: optionalDate(body.expiresAt, 'expiresAt'),
    imageUri: optionalText(body.imageUri, 'imageUri', 2_000),
    memo: optionalText(body.memo, 'memo', 500),
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
  if (!buffer.length || buffer.length > maxImageBytes) throw new Error('사진은 5MB 이하만 저장할 수 있어요.');
  // 선언된 형식이 아니라 실제 파일 시그니처로 확인합니다.
  const actualType = sniffImageType(buffer);
  if (!actualType || !imageExtension(contentType)) throw new Error('JPEG, PNG, WebP 사진만 저장할 수 있어요.');
  const extension = imageExtension(actualType);
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
    if (!match) throw new Error('사진 데이터가 올바르지 않아요.');
    return saveImage(Buffer.from(match[2], 'base64'), match[1]);
  }
  if (typeof body?.url === 'string') {
    // 내부 주소 차단·리다이렉트 재검사·스트리밍 용량 제한·파일 시그니처 확인 (safe-download.mjs)
    const { buffer, contentType } = await downloadImage(body.url, { maxBytes: maxImageBytes });
    return saveImage(buffer, contentType);
  }
  throw new Error('사진을 먼저 선택해 주세요.');
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
  const response = await fetchWithRetry(endpoint, {
    headers: { Authorization: `KakaoAK ${apiKey}` },
  }, { timeoutMs: 8_000, retries: 1, label: 'Kakao image search' });
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

  const response = await fetchWithRetry(
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
    },
    { timeoutMs: 12_000, retries: 1, label: 'Google Web Detection' },
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
      send(response, 413, { error: '요청 데이터가 너무 커요. 더 작은 사진으로 다시 시도해 주세요.' });
      return undefined;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    send(response, 400, { error: '요청 형식이 올바르지 않아요.' });
    return undefined;
  }
}

// ── 배포 설정 ──────────────────────────────────────────────
const startedAt = Date.now();
const configured = (name) => Boolean(process.env[name]?.trim());
const allowedOrigins = new Set((process.env.DASSEM_CORS_ORIGINS ?? '')
  .split(',').map((value) => value.trim().replace(/\/$/, '')).filter(Boolean));

function isAllowedOrigin(origin) {
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return allowedOrigins.has('*') || allowedOrigins.has(origin);
}

function featureFlags() {
  return {
    gemini: configured('GEMINI_API_KEY'),
    kakao: configured('KAKAO_REST_API_KEY'),
    googleVision: configured('GOOGLE_CLOUD_VISION_API_KEY'),
    eliceVision: configured('ELICE_VISION_ENDPOINT') && configured('ELICE_VISION_MODEL') && configured('ELICE_VISION_API_KEY'),
  };
}

/** 시작 시 어떤 기능이 꺼져 있는지 알아보기 쉽게 출력합니다. 키 값 자체는 출력하지 않습니다. */
function logConfig() {
  const flags = featureFlags();
  console.log(`[config] GEMINI_API_KEY ${flags.gemini ? '설정됨' : '없음'} · KAKAO_REST_API_KEY ${flags.kakao ? '설정됨' : '없음'} · GOOGLE_CLOUD_VISION_API_KEY ${flags.googleVision ? '설정됨' : '없음(선택)'}`);
  if (!flags.gemini && !flags.eliceVision) console.warn('[config] ⚠ GEMINI_API_KEY가 없어 사진 AI 인식(503)과 구매 전 AI 분석(503)이 동작하지 않아요.');
  else if (!flags.gemini) console.warn('[config] ⚠ GEMINI_API_KEY가 없어 구매 전 AI 유사도 분석(503)이 동작하지 않아요.');
  if (!flags.kakao && !flags.googleVision) console.warn('[config] ⚠ KAKAO_REST_API_KEY가 없어 인터넷 제품 사진 추천이 비어 있어요.');
  if (allowedOrigins.size) console.log(`[config] 웹 허용 주소(CORS): ${[...allowedOrigins].join(', ')}`);
  if (!process.env.DASSEM_DB_PATH) console.warn(`[config] DASSEM_DB_PATH가 없어 기본 경로를 사용해요: ${databasePath} — 배포 시 영구 볼륨 경로로 지정하세요.`);
}

function sendHealth(response) {
  let databaseOk = false;
  try {
    databaseOk = database.prepare('SELECT 1 AS ok').get()?.ok === 1;
  } catch {
    databaseOk = false;
  }
  return send(response, databaseOk ? 200 : 503, {
    status: databaseOk ? 'ok' : 'error',
    time: new Date().toISOString(),
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    database: { connected: databaseOk },
    imageStorage: { writable: existsSync(imageDirectory) },
    // 키가 설정됐는지 여부만 반환합니다. 실제 키 값은 절대 내보내지 않습니다.
    config: featureFlags(),
  });
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const path = url.pathname;
    const imageMatch = /^\/api\/images\/([0-9a-f-]+\.(?:jpg|jpeg|png|webp))$/i.exec(path);
    const doneMatch = /^\/api\/products\/([0-9a-f-]+)\/done$/i.exec(path);
    const productMatch = /^\/api\/products\/([0-9a-f-]+)$/i.exec(path);
    const knownPath = path === '/api/health' || path === '/api/products' || path === '/api/products/recognize' ||
      path === '/api/purchase-analysis' || path === '/api/records' || path === '/api/holds' ||
      path === '/api/products/images' || path === '/api/products/images/search' ||
      imageMatch || doneMatch || productMatch;
    if (!knownPath) return send(response, 404, { error: '요청한 주소를 찾을 수 없어요.' });

    // 휴대폰 앱(Expo Go·설치 앱)은 Origin 헤더를 보내지 않습니다. 브라우저(웹 빌드)만 허용 목록으로 검사합니다.
    const origin = request.headers.origin;
    if (origin) {
      if (!isAllowedOrigin(origin)) {
        return send(response, 403, { error: '허용되지 않은 웹 주소에서 온 요청이에요.' });
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

    if (request.method === 'GET' && path === '/api/health') {
      return sendHealth(response);
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
      if (!existing) return send(response, 404, { error: '제품을 찾을 수 없어요. 이미 삭제됐을 수 있어요.' });
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
      if (!existing) return send(response, 404, { error: '제품을 찾을 수 없어요. 이미 삭제됐을 수 있어요.' });
      transaction(() => {
        removeProductRecords.run(productMatch[1]);
        remove.run(productMatch[1]);
      });
      removeImageIfUnused(existing.imageUri);
      return send(response, 200, { deleted: true });
    }
    if (request.method !== 'POST' && request.method !== 'PATCH') {
      response.setHeader('Allow', 'GET, POST, PATCH, DELETE, OPTIONS');
      return send(response, 405, { error: '지원하지 않는 요청이에요.' });
    }

    const largeBody = path === '/api/products/recognize' || path === '/api/products/images' ||
      path === '/api/products/images/search';
    const body = await readJson(request, response, largeBody ? maxImageBytes + 1024 : 16_384);
    if (body === undefined) return;

    if (request.method === 'POST' && doneMatch) {
      const existing = findById.get(doneMatch[1]);
      if (!existing) return send(response, 404, { error: '제품을 찾을 수 없어요. 이미 삭제됐을 수 있어요.' });
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
        return send(response, 404, { error: '보유 중인 제품을 찾을 수 없어요.' });
      }
      const verdict = body?.verdict === 'same' ? 'same' : body?.verdict === 'similar' ? 'similar' : undefined;
      let query;
      try { query = optionalText(body?.query, 'query', 200); } catch (error) { return send(response, 400, { error: error.message }); }
      if (!verdict) return send(response, 400, { error: '판정 값이 올바르지 않아요.' });
      const createdAt = new Date().toISOString();
      insertRecord.run(randomUUID(), 'hold', productId, existing.name, existing.category,
        verdict, query ?? null, createdAt);
      return send(response, 201, { records: listRecords.all().map(publicRecord) });
    }

    if (request.method === 'PATCH' && productMatch) {
      const existing = findById.get(productMatch[1]);
      if (!existing) return send(response, 404, { error: '제품을 찾을 수 없어요. 이미 삭제됐을 수 있어요.' });
      let changed;
      try {
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('요청 형식이 올바르지 않아요.');
        // 보낸 필드만 바꿉니다. 선택 필드는 null 또는 ''을 보내면 비웁니다 (개봉일·유통기한·메모 지우기).
        const pick = (key) => (Object.hasOwn(body, key) ? body[key] : existing[key] ?? undefined);
        changed = parseProduct({
          name: pick('name'),
          brand: pick('brand'),
          category: pick('category'),
          quantity: pick('quantity'),
          openedAt: pick('openedAt'),
          expiresAt: pick('expiresAt'),
          imageUri: pick('imageUri'),
          memo: pick('memo'),
        });
      } catch (error) {
        return send(response, 400, { error: error.message });
      }
      update.run(changed.name, changed.brand ?? null, changed.category, changed.quantity,
        changed.openedAt ?? null, changed.expiresAt ?? null, changed.imageUri ?? null,
        changed.memo ?? null, productMatch[1]);
      if (existing.imageUri && localImageFile(existing.imageUri) !== localImageFile(changed.imageUri)) {
        removeImageIfUnused(existing.imageUri);
      }
      return send(response, 200, { product: publicProduct(findById.get(productMatch[1])) });
    }
    if (request.method === 'PATCH') return send(response, 404, { error: '요청한 주소를 찾을 수 없어요.' });

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
        if (!(error instanceof DownloadError)) console.warn('[images] 저장 실패:', error?.message);
        return send(response, error instanceof DownloadError ? 422 : 400, { error: error.message });
      }
    }
    if (path !== '/api/products') return send(response, 404, { error: '요청한 주소를 찾을 수 없어요.' });

    let product;
    try {
      product = parseProduct(body);
    } catch (error) {
      return send(response, 400, { error: error.message });
    }
    insert.run(product.id, product.name, product.brand ?? null, product.category, product.quantity,
      product.openedAt ?? null, product.expiresAt ?? null, product.imageUri ?? null,
      product.memo ?? null, product.createdAt);
    send(response, 201, { product: publicProduct(findById.get(product.id)) });
  } catch (error) {
    console.error(error);
    if (!response.destroyed && !response.headersSent) send(response, 500, { error: '서버에서 문제가 생겼어요. 잠시 후 다시 시도해 주세요.' });
  }
});

// 배포 플랫폼(Render·Railway 등)은 PORT만 넣어 주는 경우가 많아서, 그때는 외부 접속을 받도록 0.0.0.0을 기본으로 씁니다.
const host = process.env.DASSEM_HOST?.trim() || (process.env.PORT ? '0.0.0.0' : '127.0.0.1');
const port = Number(process.env.DASSEM_PORT || process.env.PORT || 3001);
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  console.error(`[config] 포트 값이 올바르지 않아요: ${process.env.DASSEM_PORT || process.env.PORT}`);
  process.exit(1);
}
logConfig();
server.listen(port, host, () => {
  console.log(`Products API listening on ${host}:${server.address().port}`);
  if (host === '127.0.0.1') console.log('[config] 이 컴퓨터에서만 접속할 수 있어요. 휴대폰·외부 접속은 DASSEM_HOST=0.0.0.0 으로 실행하세요.');
});

function shutdown(signal) {
  console.log(`[server] ${signal} 수신, 종료합니다.`);
  server.close(() => {
    try { database.close(); } catch { /* 이미 닫힘 */ }
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
