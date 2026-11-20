// 백엔드 API 자동 테스트 — 저장소 루트에서: node --test backend/test/
// 모든 테스트는 임시 폴더의 새 DB를 사용합니다. 실제 backend/.data DB는 건드리지 않습니다.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { fetchWithRetry } from '../http-util.mjs';
import { specDifferences, specVerdict } from '../product-spec.mjs';
import { startFakeGemini } from './fake-gemini.mjs';

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
async function startServer(dbPath, env = {}, options = {}) {
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
  // 기본 사용자: 서버마다 '테스터'를 만들어 모든 요청에 X-Dasseum-User 헤더로 보냄 (headers로 덮어쓸 수 있음)
  let defaultUser;
  const api = async (method, path, body, headers = {}) => {
    const response = await fetch(base + path, {
      method,
      headers: {
        ...(defaultUser ? { 'X-Dasseum-User': defaultUser } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let json;
    try { json = JSON.parse(text); } catch { json = undefined; }
    return { status: response.status, json, text, headers: response.headers };
  };
  // options.userId: 재시작 후에도 같은 사용자로 접속 (앱이 기기에 ID를 저장해 두는 것과 같음)
  if (options.userId) defaultUser = options.userId;
  else if (options.user !== false) {
    defaultUser = (await api('POST', '/api/users', { name: options.userName ?? '테스터' })).json.user.id;
  }
  const stop = () => new Promise((resolve) => {
    child.removeAllListeners('exit');
    child.once('exit', resolve);
    child.kill('SIGTERM');
  });
  return { api, stop, log: () => log, userId: () => defaultUser };
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
      assert.match(server.log(), /users 테이블 생성/);
      assert.match(server.log(), /products 테이블에 userId 열 추가/);
      assert.match(server.log(), /사용자 구분 이전 데이터: 제품 1개, 기록 0개 — 삭제하지 않고 숨겨서 보관/);
      // 사용자 구분 이전 제품은 어떤 사용자에게도 보이지 않고, 수정도 불가
      assert.equal((await server.api('GET', '/api/products')).json.products.length, 0);
      const patch = await server.api('PATCH', '/api/products/11111111-1111-1111-1111-111111111111', { memo: '욕실 선반' });
      assert.equal(patch.status, 404);
    } finally { await server.stop(); }

    // 두 번째 시작에서는 추가 작업 없이 그대로, 기존 데이터는 DB에 그대로 남아 있음
    const again = await startServer(dbPath);
    try {
      assert.match(again.log(), /products 테이블 최신 상태/);
      assert.doesNotMatch(again.log(), /userId 열 추가/);
    } finally { await again.stop(); }
    const check = new DatabaseSync(dbPath);
    const row = check.prepare('SELECT name, quantity, userId FROM products WHERE id = ?').get('11111111-1111-1111-1111-111111111111');
    check.close();
    assert.deepEqual({ ...row }, { name: '기존 토너', quantity: 2, userId: null });
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

    server = await startServer(dbPath, {}, { userId: server.userId() });
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
      assert.equal(records.filter((r) => r.productId === otherId).length, 0, '삭제된 제품과의 연결은 끊김');
      const kept = records.filter((r) => r.type === 'hold' && r.query === '비타민D 2000IU');
      assert.equal(kept.length, 1, '제품을 지워도 구매 보류 기록은 남음');
      assert.equal(kept[0].name, '비타민D');
      assert.equal(kept[0].category, '영양제');

      // '모든 데이터 초기화'용 기록 전체 삭제
      const cleared = await server.api('DELETE', '/api/records');
      assert.equal(cleared.status, 200);
      assert.equal((await server.api('GET', '/api/records')).json.records.length, 0);
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

  test('24시간 넘게 어떤 제품에도 연결되지 않은 사진만 시작 시 정리', async () => {
    const { dbPath, imageDir } = tempDb();
    let server = await startServer(dbPath);
    let kept;
    try {
      kept = (await server.api('POST', '/api/products/images', { image: `data:image/png;base64,${PNG}` })).json.imageUri.split('/').pop();
      await server.api('POST', '/api/products', { name: '사진 있는 제품', category: '화장품', imageUri: `/api/images/${kept}` });
    } finally { await server.stop(); }
    mkdirSync(imageDir, { recursive: true });
    const png = Buffer.from(PNG, 'base64');
    const oldOrphan = '11111111-2222-3333-4444-555555555555.png';
    const newOrphan = '66666666-7777-8888-9999-000000000000.png';
    writeFileSync(join(imageDir, oldOrphan), png);
    writeFileSync(join(imageDir, newOrphan), png);
    const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000);
    utimesSync(join(imageDir, oldOrphan), twoDaysAgo, twoDaysAgo);
    utimesSync(join(imageDir, kept), twoDaysAgo, twoDaysAgo);

    server = await startServer(dbPath);
    try {
      assert.match(server.log(), /연결되지 않은 사진 1개 정리/);
      assert.ok(!existsSync(join(imageDir, oldOrphan)), '오래된 미연결 사진 삭제');
      assert.ok(existsSync(join(imageDir, newOrphan)), '방금 올린 사진은 등록 중일 수 있어 유지');
      assert.ok(existsSync(join(imageDir, kept)), '제품이 쓰는 사진은 오래돼도 유지');
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

describe('제품 규격 비교 (용량·함량)', () => {
  test('규격을 뺀 이름이 같으면 규격 차이로 동일/유사 판정', () => {
    const vit = { name: '비타민D 1000IU', brand: '온데이' };
    assert.equal(specVerdict('비타민D 2000IU', vit), 'similar');
    assert.equal(specVerdict('온데이 비타민D 1000IU', vit), 'same');
    assert.equal(specVerdict('센텔라 수분 크림', { name: '센텔라 수분 크림 80ml' }), 'same', '검색어에 용량이 없으면 같은 제품');
    assert.equal(specVerdict('샴푸 1L', { name: '샴푸 1000ml' }), 'same', '단위 환산');
    assert.equal(specVerdict('센텔라 수분크림 100㎖', { name: '센텔라 수분 크림 80ml' }), 'similar', '전각 단위·띄어쓰기');
    assert.equal(specVerdict('마그네슘 500mg', vit), undefined, '이름이 다르면 임베딩 판정을 따름');
    assert.deepEqual(specDifferences('오메가3 60캡슐', '오메가3 90캡슐'), [{ unit: '캡슐', query: '60캡슐', owned: '90캡슐' }]);
    assert.deepEqual(specDifferences('마그네슘 500mg', '마그네슘 500mg 120정'), []);
  });
});

describe('구매 분석 (가짜 Gemini)', () => {
  test('임베딩을 SQLite에 저장해 재시작 후 다시 요청하지 않고, 규격 차이를 판정에 반영', async () => {
    const gemini = await startFakeGemini();
    const { dbPath } = tempDb();
    const env = { GEMINI_API_KEY: 'test-key', GEMINI_API_BASE_URL: gemini.url };
    let server = await startServer(dbPath, env);
    try {
      const vit = (await server.api('POST', '/api/products', { name: '비타민D 1000IU', brand: '온데이', category: '영양제', expiresAt: '2027-06-30' })).json.product.id;
      await server.api('POST', '/api/products', { name: '오메가3 90캡슐', category: '영양제' });
      await server.api('POST', '/api/products', { name: '센텔라 수분 크림 80ml', category: '화장품' });

      const first = await server.api('POST', '/api/purchase-analysis', { query: '비타민D 2000IU' });
      assert.equal(first.status, 200);
      assert.equal(first.json.verdict, 'similar');
      assert.equal(first.json.matchedBy, 'name');
      assert.equal(first.json.matches[0].productId, vit);
      assert.deepEqual(first.json.specDifference, [{ unit: 'IU', query: '2000IU', owned: '1000IU' }]);
      assert.match(gemini.state.lastPrompt, /규격 차이: 보유 제품은 1000IU, 구매 예정 제품은 2000IU/);
      assert.ok(gemini.state.embedCalls >= 2, '처음에는 검색어와 보유 제품 임베딩을 요청');

      gemini.reset();
      const again = await server.api('POST', '/api/purchase-analysis', { query: '비타민D 2000IU' });
      assert.equal(again.json.verdict, 'similar');
      assert.equal(gemini.state.embedCalls, 0, '같은 서버에서는 캐시 사용');
    } finally { await server.stop(); }

    gemini.reset();
    server = await startServer(dbPath, env, { userId: server.userId() });
    try {
      assert.match(server.log(), /임베딩 캐시 [1-9]\d*개/);
      const afterRestart = await server.api('POST', '/api/purchase-analysis', { query: '비타민D 2000IU' });
      assert.equal(afterRestart.json.verdict, 'similar');
      assert.equal(gemini.state.embedCalls, 0, '재시작 후에도 SQLite 캐시로 임베딩 재요청 없음');

      const same = await server.api('POST', '/api/purchase-analysis', { query: '센텔라 수분 크림' });
      assert.equal(same.json.verdict, 'same', '검색어에 용량이 없으면 같은 제품으로 판정');
      assert.deepEqual(same.json.specDifference, []);

      gemini.reset();
      await server.api('POST', '/api/products', { name: '선크림 SPF50', category: '화장품' });
      await server.api('POST', '/api/purchase-analysis', { query: '선크림' });
      assert.ok(gemini.state.embedTexts.includes('선크림 SPF50'), '새로 등록한 제품만 새로 계산');
      assert.ok(!gemini.state.embedTexts.includes('센텔라 수분 크림 80ml'), '이미 계산한 제품은 재요청 없음');
    } finally { await server.stop(); gemini.close(); }
  });
});

describe('Structured Output · 계산된 숫자 전달 (가짜 Gemini)', () => {
  test('사진 인식은 스키마로 요청하고, 라벨 규격을 제품명에 붙여 반환', async () => {
    const gemini = await startFakeGemini();
    const { dbPath } = tempDb();
    const server = await startServer(dbPath, { GEMINI_API_KEY: 'test-key', GEMINI_API_BASE_URL: gemini.url });
    try {
      gemini.state.vision = { name: 'VITAMIN C', brand: 'Bronson', spec: '500mg 250정', category: '영양제', expiresAt: '2027-03-31' };
      const res = await server.api('POST', '/api/products/recognize', { image: `data:image/png;base64,${PNG}` });
      assert.equal(res.status, 200);
      assert.equal(res.json.suggestion.name, 'VITAMIN C 500mg 250정');
      assert.equal(res.json.suggestion.spec, '500mg 250정');
      assert.equal(res.json.suggestion.expiresAt, '2027-03-31');
      const schema = gemini.state.lastConfig.responseJsonSchema;
      assert.equal(schema.type, 'object');
      assert.deepEqual(schema.properties.category.enum, ['화장품', '영양제', '의약품', '생활용품', '알 수 없음']);
      assert.deepEqual(schema.properties.name.type, ['string', 'null']);
      assert.ok(schema.required.includes('spec'));
      assert.ok(!JSON.stringify(schema).includes('nullable'), 'nullable 대신 type 배열 사용');

      gemini.state.vision = { name: '비타민D 1000IU', brand: null, spec: '1000IU', category: '알 수 없음', expiresAt: null };
      const dup = await server.api('POST', '/api/products/recognize', { image: `data:image/png;base64,${PNG}` });
      assert.equal(dup.json.suggestion.name, '비타민D 1000IU', '이미 제품명에 있는 규격은 다시 붙이지 않음');
      assert.equal(dup.json.suggestion.category, null, "'알 수 없음'은 null로");

      // 스키마를 거부하는 모델이면 스키마 없이 한 번 더 요청해 성공
      gemini.state.rejectSchema = true;
      gemini.state.visionCalls = 0;
      const noSchema = await server.api('POST', '/api/products/recognize', { image: `data:image/png;base64,${PNG}` });
      assert.equal(noSchema.status, 200);
      assert.equal(gemini.state.visionCalls, 1);
      assert.equal(gemini.state.lastConfig.responseJsonSchema, undefined);
    } finally { await server.stop(); gemini.close(); }
  });

  test('판단 문구는 스키마로 요청하고, 서버가 계산한 수량·남은 기간을 넘김. AI 실패 시에도 숫자를 포함', async () => {
    const gemini = await startFakeGemini();
    const { dbPath } = tempDb();
    const server = await startServer(dbPath, { GEMINI_API_KEY: 'test-key', GEMINI_API_BASE_URL: gemini.url });
    try {
      const expires = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
      await server.api('POST', '/api/products', { name: '비타민C 1000mg', brand: '고려은단', category: '영양제', quantity: 2, expiresAt: expires });

      const ok = await server.api('POST', '/api/purchase-analysis', { query: '비타민C 1000mg' });
      assert.equal(ok.json.verdict, 'same');
      assert.equal(ok.json.provider, 'Gemini');
      assert.deepEqual(gemini.state.lastConfig.responseJsonSchema.properties.decision.enum, ['BUY', 'CHECK_FIRST', 'HOLD']);
      assert.match(gemini.state.lastPrompt, /보유 수량 2개, 사용기한 (29|30|31)일 남음 \(D-(29|30|31)\), 미개봉/);
      assert.doesNotMatch(gemini.state.lastPrompt, /expiresAt/, '원본 날짜 대신 계산된 문장을 전달');

      gemini.state.rejectSchema = true;
      const retried = await server.api('POST', '/api/purchase-analysis', { query: '비타민C 1000mg' });
      assert.equal(retried.json.provider, 'Gemini', '스키마 거부 시 스키마 없이 재요청해 AI 문구 사용');
      gemini.state.rejectSchema = false;

      gemini.state.failAdvice = true;
      const fallback = await server.api('POST', '/api/purchase-analysis', { query: '비타민C 1000mg' });
      assert.equal(fallback.status, 200);
      assert.equal(fallback.json.provider, 'rules');
      assert.equal(fallback.json.decision, 'HOLD');
      assert.match(fallback.json.reason, /2개를 갖고 있어요 \(사용기한 (29|30|31)일 남음/);
    } finally { await server.stop(); gemini.close(); }
  });
});

describe('사용자 구분', () => {
  test('사용자마다 제품·기록이 분리되고, 다른 사용자의 제품은 조회·수정·삭제 불가', async () => {
    const { dbPath } = tempDb();
    const server = await startServer(dbPath, {}, { userName: '지민' });
    try {
      const jimin = server.userId();
      const friend = (await server.api('POST', '/api/users', { name: '  영석  ' })).json.user;
      assert.equal(friend.name, '영석', '앞뒤 공백 정리');
      const asFriend = { 'X-Dasseum-User': friend.id };

      const mine = (await server.api('POST', '/api/products', { name: '선크림', category: '화장품' })).json.product.id;
      await server.api('POST', '/api/products', { name: '샴푸', category: '생활용품' }, asFriend);
      await server.api('POST', `/api/products/${mine}/done`, {});

      assert.deepEqual((await server.api('GET', '/api/products')).json.products.map((p) => p.name), ['선크림']);
      assert.deepEqual((await server.api('GET', '/api/products', undefined, asFriend)).json.products.map((p) => p.name), ['샴푸']);
      assert.equal((await server.api('GET', '/api/records', undefined, asFriend)).json.records.length, 0, '다른 사람의 다씀 기록은 안 보임');
      assert.ok(!(await server.api('GET', '/api/products')).text.includes('userId'), '응답에 userId 노출 안 함');

      assert.equal((await server.api('PATCH', `/api/products/${mine}`, { memo: 'x' }, asFriend)).status, 404);
      assert.equal((await server.api('DELETE', `/api/products/${mine}`, undefined, asFriend)).status, 404);
      assert.equal((await server.api('POST', `/api/products/${mine}/done`, {}, asFriend)).status, 404);
      assert.equal((await server.api('POST', '/api/holds', { productId: mine, verdict: 'same' }, asFriend)).status, 404);
      await server.api('DELETE', '/api/records', undefined, asFriend);
      assert.equal((await server.api('GET', '/api/records')).json.records.length, 1, '다른 사람의 초기화가 내 기록을 지우지 않음');

      const me = await server.api('GET', '/api/users/me');
      assert.deepEqual(me.json.user, { id: jimin, name: '지민' });
      const renamed = await server.api('PATCH', '/api/users/me', { name: '지민2' });
      assert.equal(renamed.json.user.name, '지민2');
      assert.equal((await server.api('PATCH', '/api/users/me', { name: '' })).status, 400);
      assert.equal((await server.api('POST', '/api/users', { name: 'x'.repeat(21) })).status, 400);
    } finally { await server.stop(); }
  });

  test('사용자 헤더가 없거나 모르는 ID면 401, health와 사진 파일은 공개', async () => {
    const { dbPath } = tempDb();
    const server = await startServer(dbPath, {}, { user: false });
    try {
      for (const [method, path] of [['GET', '/api/products'], ['GET', '/api/records'], ['POST', '/api/products'], ['POST', '/api/products/recognize'], ['POST', '/api/purchase-analysis'], ['POST', '/api/products/images']]) {
        const res = await server.api(method, path, method === 'POST' ? {} : undefined);
        assert.equal(res.status, 401, `${method} ${path}`);
        assert.equal(res.json.code, 'USER_REQUIRED');
      }
      const unknown = await server.api('GET', '/api/products', undefined, { 'X-Dasseum-User': '00000000-0000-4000-8000-000000000000' });
      assert.equal(unknown.status, 401);
      assert.equal((await server.api('GET', '/api/health')).status, 200);
    } finally { await server.stop(); }
  });
});

describe('요청 제한', () => {
  test('AI 요청은 사용자별 한도를 넘으면 429(Retry-After), 다른 사용자는 영향 없음', async () => {
    const { dbPath } = tempDb();
    const server = await startServer(dbPath, { DASSEM_AI_LIMIT_PER_USER: '3' });
    try {
      for (let i = 0; i < 3; i += 1) {
        assert.equal((await server.api('POST', '/api/purchase-analysis', { query: '선크림' })).status, 503, '키 없음(503)이어도 횟수에 포함');
      }
      const limited = await server.api('POST', '/api/purchase-analysis', { query: '선크림' });
      assert.equal(limited.status, 429);
      assert.equal(limited.json.code, 'RATE_LIMITED');
      assert.match(limited.json.error, /요청이 너무 많아요/);
      assert.ok(Number(limited.headers.get('retry-after')) > 0);
      assert.equal((await server.api('GET', '/api/products')).status, 200, '일반 API는 제한 없음');

      const other = (await server.api('POST', '/api/users', { name: '다른사람' })).json.user.id;
      assert.equal((await server.api('POST', '/api/purchase-analysis', { query: '선크림' }, { 'X-Dasseum-User': other })).status, 503);
    } finally { await server.stop(); }
  });

  test('사용자 생성은 IP별 한도로 대량 생성을 막음', async () => {
    const { dbPath } = tempDb();
    const server = await startServer(dbPath, { DASSEM_SIGNUP_LIMIT_PER_IP: '2' }, { user: false });
    try {
      assert.equal((await server.api('POST', '/api/users', { name: 'a' })).status, 201);
      assert.equal((await server.api('POST', '/api/users', { name: 'b' })).status, 201);
      assert.equal((await server.api('POST', '/api/users', { name: 'c' })).status, 429);
    } finally { await server.stop(); }
  });
});
