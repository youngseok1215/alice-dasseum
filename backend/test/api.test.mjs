// 백엔드 API 자동 테스트 — 저장소 루트에서: node --test backend/test/
// 모든 테스트는 임시 폴더의 새 DB를 사용합니다. 실제 backend/.data DB는 건드리지 않습니다.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { fetchWithRetry } from '../http-util.mjs';

const serverFile = fileURLToPath(new URL('../server.mjs', import.meta.url));
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC';
const tempDirs = [];
after(() => tempDirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

function tempDb() {
  const dir = mkdtempSync(join(tmpdir(), 'dasseum-test-'));
  tempDirs.push(dir);
  return { dir, dbPath: join(dir, 'products.sqlite'), imageDir: join(dir, 'images') };
}

/** 서버를 띄우고 로그에서 실제 포트를 읽습니다. 키 환경변수는 테스트마다 명시한 것만 넘깁니다. */
async function startServer(dbPath, env = {}) {
  const child = spawn(process.execPath, ['--no-warnings', serverFile], {
    env: { PATH: process.env.PATH, DASSEM_DB_PATH: dbPath, DASSEM_HOST: '127.0.0.1', DASSEM_PORT: '0', ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`server did not start:\n${log}`)), 10_000);
    const onData = (chunk) => {
      log += chunk;
      const match = /listening on [^:]+:(\d+)/.exec(log);
      if (match) { clearTimeout(timer); resolve(Number(match[1])); }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('exit', (code) => { clearTimeout(timer); reject(new Error(`server exited ${code}:\n${log}`)); });
  });
  const base = `http://127.0.0.1:${port}`;
  const api = async (method, path, body, headers = {}) => {
    const response = await fetch(base + path, {
      method,
      headers: body === undefined ? headers : { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let json;
    try { json = JSON.parse(text); } catch { json = undefined; }
    return { status: response.status, json, text, headers: response.headers };
  };
  const stop = () => new Promise((resolve) => {
    child.removeAllListeners('exit');
    child.once('exit', resolve);
    child.kill('SIGTERM');
  });
  return { api, stop, log: () => log };
}

describe('GET /api/health', () => {
  test('DB 연결 상태와 키 설정 여부(boolean)만 반환하고 키 값은 노출하지 않음', async () => {
    const { dbPath } = tempDb();
    const server = await startServer(dbPath, { GEMINI_API_KEY: 'secret-gemini-123', KAKAO_REST_API_KEY: '' });
    try {
      const res = await server.api('GET', '/api/health');
      assert.equal(res.status, 200);
      assert.equal(res.json.status, 'ok');
      assert.equal(res.json.database.connected, true);
      assert.ok(!Number.isNaN(Date.parse(res.json.time)));
      assert.deepEqual(res.json.config, { gemini: true, kakao: false, googleVision: false, eliceVision: false });
      assert.ok(!res.text.includes('secret-gemini-123'));
      assert.ok(!server.log().includes('secret-gemini-123'), '로그에도 키 값이 찍히면 안 됨');
    } finally { await server.stop(); }
  });
});

describe('DB 마이그레이션', () => {
  test('구버전 SQLite 파일에 새 열과 활동 기록 테이블을 추가하고 기존 제품을 유지', async () => {
    const { dbPath } = tempDb();
    const old = new DatabaseSync(dbPath);
    old.exec(`CREATE TABLE products (
      id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, category TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0), openedAt TEXT, expiresAt TEXT, createdAt TEXT NOT NULL
    ) STRICT`);
    old.prepare('INSERT INTO products VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run('11111111-1111-1111-1111-111111111111', '기존 토너', '화장품', 2, '2026-10-01', '2027-10-01', '2026-10-01T00:00:00.000Z');
    old.close();

    const server = await startServer(dbPath);
    try {
      assert.match(server.log(), /brand, imageUri, status, completedAt, memo 열 추가/);
      assert.match(server.log(), /activity_records 테이블 생성/);
      const res = await server.api('GET', '/api/products');
      assert.equal(res.json.products.length, 1);
      assert.equal(res.json.products[0].name, '기존 토너');
      assert.equal(res.json.products[0].quantity, 2);
      assert.equal(res.json.products[0].status, 'owned');
      const memo = await server.api('PATCH', '/api/products/11111111-1111-1111-1111-111111111111', { memo: '욕실 선반' });
      assert.equal(memo.json.product.memo, '욕실 선반');
    } finally { await server.stop(); }

    // 두 번째 시작에서는 추가 작업 없이 그대로
    const again = await startServer(dbPath);
    try {
      assert.match(again.log(), /products 테이블 최신 상태/);
      assert.equal((await again.api('GET', '/api/products')).json.products[0].memo, '욕실 선반');
    } finally { await again.stop(); }
  });
});

describe('제품 등록·수정·다씀·보류', () => {
  test('수량·메모가 등록·수정 API에서 누락되지 않고, 비운 값은 지워짐', async () => {
    const { dbPath } = tempDb();
    const server = await startServer(dbPath);
    try {
      const created = await server.api('POST', '/api/products', {
        name: '수분 크림', brand: '센텔라', category: '화장품', quantity: 3,
        openedAt: '2026-11-01', expiresAt: '2027-11-01', memo: '화장대 둘째 칸',
      });
      assert.equal(created.status, 201);
      const id = created.json.product.id;
      assert.equal(created.json.product.quantity, 3);
      assert.equal(created.json.product.memo, '화장대 둘째 칸');

      const qty = await server.api('PATCH', `/api/products/${id}`, { quantity: 5 });
      assert.equal(qty.json.product.quantity, 5);
      assert.equal(qty.json.product.memo, '화장대 둘째 칸', '수량만 바꿔도 메모 유지');
      assert.equal(qty.json.product.openedAt, '2026-11-01');

      const cleared = await server.api('PATCH', `/api/products/${id}`, { openedAt: null, expiresAt: '', memo: null, brand: null });
      assert.equal(cleared.json.product.openedAt, undefined);
      assert.equal(cleared.json.product.expiresAt, undefined);
      assert.equal(cleared.json.product.memo, undefined);
      assert.equal(cleared.json.product.brand, undefined);
      assert.equal(cleared.json.product.quantity, 5);

      const bad = await server.api('PATCH', `/api/products/${id}`, { quantity: 0 });
      assert.equal(bad.status, 400);
      assert.match(bad.json.error, /수량/);
      const badDate = await server.api('POST', '/api/products', { name: 'x', category: '화장품', expiresAt: '2026-02-30' });
      assert.equal(badDate.status, 400);
      assert.match(badDate.json.error, /날짜/);
      const missing = await server.api('PATCH', '/api/products/00000000-0000-0000-0000-000000000000', { quantity: 1 });
      assert.equal(missing.status, 404);
      assert.match(missing.json.error, /제품을 찾을 수 없어요/);
    } finally { await server.stop(); }
  });

  test('다씀·되돌리기·구매 보류가 서버 재시작 후에도 유지', async () => {
    const { dbPath } = tempDb();
    let server = await startServer(dbPath);
    let id;
    let otherId;
    try {
      id = (await server.api('POST', '/api/products', { name: '샴푸', category: '생활용품', quantity: 1 })).json.product.id;
      otherId = (await server.api('POST', '/api/products', { name: '비타민D', category: '영양제', quantity: 2 })).json.product.id;
      const done = await server.api('POST', `/api/products/${id}/done`, {});
      assert.equal(done.json.product.status, 'done');
      assert.ok(done.json.product.completedAt);
      const hold = await server.api('POST', '/api/holds', { productId: otherId, query: '비타민D 2000IU', verdict: 'similar' });
      assert.equal(hold.status, 201);
      const holdDone = await server.api('POST', '/api/holds', { productId: id, query: '샴푸', verdict: 'same' });
      assert.equal(holdDone.status, 404, '다 쓴 제품으로는 보류 기록을 만들지 않음');
    } finally { await server.stop(); }

    server = await startServer(dbPath);
    try {
      const products = (await server.api('GET', '/api/products')).json.products;
      assert.equal(products.find((p) => p.id === id).status, 'done');
      let records = (await server.api('GET', '/api/records')).json.records;
      assert.equal(records.filter((r) => r.type === 'done' && r.productId === id).length, 1);
      assert.equal(records.filter((r) => r.type === 'hold' && r.query === '비타민D 2000IU').length, 1);

      const undo = await server.api('DELETE', `/api/products/${id}/done`);
      assert.equal(undo.json.product.status, 'owned');
      assert.equal(undo.json.product.completedAt, undefined);
      records = undo.json.records;
      assert.equal(records.filter((r) => r.type === 'done').length, 0);
      assert.equal(records.filter((r) => r.type === 'hold').length, 1, '되돌리기는 보류 기록을 지우지 않음');

      const deleted = await server.api('DELETE', `/api/products/${otherId}`);
      assert.equal(deleted.json.deleted, true);
      records = (await server.api('GET', '/api/records')).json.records;
      assert.equal(records.filter((r) => r.productId === otherId).length, 0);
    } finally { await server.stop(); }
  });
});

describe('사진 저장·정리', () => {
  test('다른 제품이 같은 사진을 쓰면 남기고, 마지막 참조가 사라질 때만 삭제', async () => {
    const { dbPath, imageDir } = tempDb();
    const server = await startServer(dbPath);
    try {
      const saved = await server.api('POST', '/api/products/images', { image: `data:image/png;base64,${PNG}` });
      assert.equal(saved.status, 201);
      const imageUri = saved.json.imageUri;
      const file = imageUri.split('/').pop();
      assert.ok(existsSync(join(imageDir, file)));

      const a = (await server.api('POST', '/api/products', { name: 'A', category: '화장품', imageUri })).json.product.id;
      // 다른 제품은 화면용 절대 주소로 같은 사진을 참조하는 경우 (예전 데이터)
      const b = (await server.api('POST', '/api/products', { name: 'B', category: '화장품', imageUri: `http://192.168.0.5:3001${imageUri}` })).json.product.id;

      await server.api('DELETE', `/api/products/${a}`);
      assert.ok(existsSync(join(imageDir, file)), 'B가 아직 참조 중이므로 유지');
      await server.api('DELETE', `/api/products/${b}`);
      assert.ok(!existsSync(join(imageDir, file)), '참조가 없어지면 삭제');

      const first = (await server.api('POST', '/api/products/images', { image: `data:image/png;base64,${PNG}` })).json.imageUri;
      const second = (await server.api('POST', '/api/products/images', { image: `data:image/png;base64,${PNG}` })).json.imageUri;
      const c = (await server.api('POST', '/api/products', { name: 'C', category: '화장품', imageUri: first })).json.product.id;
      await server.api('PATCH', `/api/products/${c}`, { memo: '사진 그대로' });
      assert.ok(existsSync(join(imageDir, first.split('/').pop())), '사진을 안 바꾸면 유지');
      await server.api('PATCH', `/api/products/${c}`, { imageUri: second });
      assert.ok(!existsSync(join(imageDir, first.split('/').pop())), '사진을 바꾸면 이전 사진 삭제');
      assert.ok(existsSync(join(imageDir, second.split('/').pop())));
      assert.equal(readdirSync(imageDir).length, 1);
    } finally { await server.stop(); }
  });

  test('형식 위조·내부 주소 다운로드 차단', async () => {
    const { dbPath } = tempDb();
    const server = await startServer(dbPath);
    try {
      const fake = await server.api('POST', '/api/products/images', { image: `data:image/png;base64,${Buffer.from('<svg/>').toString('base64')}` });
      assert.equal(fake.status, 400);
      for (const url of ['http://127.0.0.1:1/a.png', 'http://localhost/a.png', 'http://10.0.0.1/a.png',
        'http://192.168.1.1/a.png', 'http://169.254.169.254/latest', 'http://[::1]/a.png', 'file:///etc/passwd']) {
        const res = await server.api('POST', '/api/products/images', { url });
        assert.equal(res.status, 422, url);
        assert.match(res.json.error, /[가-힣]/, '한국어 오류');
      }
    } finally { await server.stop(); }
  });
});

describe('CORS·키 미설정', () => {
  test('허용 목록 밖의 웹 주소는 403, 허용 주소와 앱(Origin 없음)은 통과', async () => {
    const { dbPath } = tempDb();
    const server = await startServer(dbPath, { DASSEM_CORS_ORIGINS: 'https://dasseum.example.com' });
    try {
      assert.equal((await server.api('GET', '/api/products', undefined, { Origin: 'https://evil.example.com' })).status, 403);
      const ok = await server.api('GET', '/api/products', undefined, { Origin: 'https://dasseum.example.com' });
      assert.equal(ok.status, 200);
      assert.equal(ok.headers.get('access-control-allow-origin'), 'https://dasseum.example.com');
      assert.equal((await server.api('GET', '/api/products')).status, 200);
    } finally { await server.stop(); }
  });

  test('GEMINI 키가 없으면 AI 기능은 한국어 503', async () => {
    const { dbPath } = tempDb();
    const server = await startServer(dbPath);
    try {
      assert.match(server.log(), /GEMINI_API_KEY가 없어/);
      const analysis = await server.api('POST', '/api/purchase-analysis', { query: '선크림' });
      assert.equal(analysis.status, 503);
      assert.match(analysis.json.error, /GEMINI_API_KEY/);
      const recognize = await server.api('POST', '/api/products/recognize', { image: `data:image/png;base64,${PNG}` });
      assert.equal(recognize.status, 503);
      assert.match(recognize.json.error, /[가-힣]/);
    } finally { await server.stop(); }
  });
});

describe('fetchWithRetry', () => {
  async function fakeUpstream(statuses) {
    let calls = 0;
    const upstream = createServer((req, res) => {
      const status = statuses[Math.min(calls, statuses.length - 1)];
      calls += 1;
      if (status === 'hang') return; // 응답하지 않음 → 타임아웃
      res.writeHead(status).end('{}');
    });
    await new Promise((resolve) => upstream.listen(0, '127.0.0.1', resolve));
    return { url: `http://127.0.0.1:${upstream.address().port}`, calls: () => calls, close: () => { upstream.closeAllConnections(); upstream.close(); } };
  }

  test('5xx는 1회 재시도 후 성공', async () => {
    const up = await fakeUpstream([503, 200]);
    try {
      const res = await fetchWithRetry(up.url, {}, { retries: 1, label: 'test' });
      assert.equal(res.status, 200);
      assert.equal(up.calls(), 2);
    } finally { up.close(); }
  });

  test('429는 재시도하지 않고, 재시도 횟수는 최대 2회로 제한', async () => {
    const limited = await fakeUpstream([429]);
    const failing = await fakeUpstream([500]);
    try {
      assert.equal((await fetchWithRetry(limited.url, {}, { retries: 2, label: 'test' })).status, 429);
      assert.equal(limited.calls(), 1);
      assert.equal((await fetchWithRetry(failing.url, {}, { retries: 99, label: 'test' })).status, 500);
      assert.equal(failing.calls(), 3, '최초 1회 + 재시도 최대 2회');
    } finally { limited.close(); failing.close(); }
  });

  test('응답이 없으면 타임아웃 후 제한된 횟수만 재시도하고 오류', async () => {
    const up = await fakeUpstream(['hang']);
    try {
      await assert.rejects(fetchWithRetry(up.url, {}, { timeoutMs: 200, retries: 1, label: 'test' }), { name: 'TimeoutError' });
      assert.equal(up.calls(), 2);
    } finally { up.close(); }
  });
});
