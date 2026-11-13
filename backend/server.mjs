import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { recognizeProduct } from './product-vision.mjs';

const categories = ['화장품', '영양제', '의약품', '생활용품'];
const databasePath = process.env.DASSEM_DB_PATH
  ? resolve(process.env.DASSEM_DB_PATH)
  : fileURLToPath(new URL('./.data/products.sqlite', import.meta.url));
mkdirSync(dirname(databasePath), { recursive: true });
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
const insert = database.prepare(`
  INSERT INTO products (id, name, category, quantity, openedAt, expiresAt, createdAt)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
const list = database.prepare('SELECT * FROM products ORDER BY createdAt DESC, rowid DESC');

function send(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
}

function optionalDate(value, field) {
  if (value === undefined || value === '') return undefined;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T00:00:00Z`);
    if (!Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value) return value;
  }
  throw new Error(`${field} must be a valid YYYY-MM-DD date`);
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
    id: randomUUID(), name: name.trim(), category, quantity,
    openedAt: optionalDate(body.openedAt, 'openedAt'),
    expiresAt: optionalDate(body.expiresAt, 'expiresAt'),
    createdAt: new Date().toISOString(),
  };
}

const server = createServer(async (request, response) => {
  try {
    const path = request.url.split('?')[0];
    const isRecognition = path === '/api/products/recognize';
    if (path !== '/api/products' && !isRecognition) return send(response, 404, { error: 'Not found' });
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
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      return response.end();
    }
    if (request.method === 'GET' && !isRecognition) {
      const products = list.all().map(({ openedAt, expiresAt, ...product }) => ({
        ...product, openedAt: openedAt ?? undefined, expiresAt: expiresAt ?? undefined,
      }));
      return send(response, 200, { products });
    }
    if (request.method !== 'POST') {
      response.setHeader('Allow', isRecognition ? 'POST, OPTIONS' : 'GET, POST, OPTIONS');
      return send(response, 405, { error: 'Method not allowed' });
    }
    const chunks = [];
    let size = 0;
    for await (const chunk of request.iterator({ destroyOnReturn: false })) {
      size += chunk.length;
      if (size > (isRecognition ? 5 * 1024 * 1024 : 16_384)) {
        response.setHeader('Connection', 'close');
        return send(response, 413, { error: 'Request body too large' });
      }
      chunks.push(chunk);
    }
    let body;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      return send(response, 400, { error: 'Invalid JSON' });
    }
    if (isRecognition) {
      const { status, result } = await recognizeProduct(body?.image, categories);
      return send(response, status, result);
    }
    let product;
    try {
      product = parseProduct(body);
    } catch (error) {
      return send(response, 400, { error: error.message });
    }
    insert.run(product.id, product.name, product.category, product.quantity,
      product.openedAt ?? null, product.expiresAt ?? null, product.createdAt);
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
