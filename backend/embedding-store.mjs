// Gemini 임베딩 SQLite 캐시
// - 키: sha256(모델:차원:텍스트) → 제품명·브랜드가 바뀌면 자동으로 새 키가 되어 다시 계산됩니다.
// - 서버를 재시작해도 이미 계산한 제품 임베딩을 다시 요청하지 않아 첫 검색이 빨라지고 API 호출이 줄어듭니다.
// - 벡터는 Float32 BLOB(768차원 ≈ 3KB)으로 저장합니다.
import { createHash } from 'node:crypto';

export function createEmbeddingStore(database, { model, dimensions }) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS embedding_cache (
      key TEXT PRIMARY KEY NOT NULL,
      model TEXT NOT NULL,
      dimensions INTEGER NOT NULL,
      vector BLOB NOT NULL,
      createdAt TEXT NOT NULL,
      lastUsedAt TEXT NOT NULL
    ) STRICT
  `);
  const select = database.prepare('SELECT vector FROM embedding_cache WHERE key = ?');
  const touch = database.prepare('UPDATE embedding_cache SET lastUsedAt = ? WHERE key = ?');
  const upsert = database.prepare(`
    INSERT INTO embedding_cache (key, model, dimensions, vector, createdAt, lastUsedAt) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET vector = excluded.vector, lastUsedAt = excluded.lastUsedAt
  `);
  // 90일 동안 쓰이지 않은 검색어 임베딩은 시작 시 정리 (보유 제품 임베딩은 검색할 때마다 lastUsedAt이 갱신됨)
  const prune = database.prepare('DELETE FROM embedding_cache WHERE lastUsedAt < ?');
  const count = database.prepare('SELECT COUNT(*) AS n FROM embedding_cache');

  const keyOf = (text) => createHash('sha256').update(`${model}:${dimensions}:${text}`).digest('hex');

  return {
    /** @returns {number[] | undefined} */
    get(text) {
      const key = keyOf(text);
      const row = select.get(key);
      if (!row) return undefined;
      const bytes = row.vector;
      const floats = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
      if (floats.length !== dimensions) return undefined;
      touch.run(new Date().toISOString(), key);
      return Array.from(floats);
    },
    set(text, vector) {
      if (!Array.isArray(vector) || vector.length !== dimensions) return;
      const now = new Date().toISOString();
      const blob = Buffer.from(new Float32Array(vector).buffer);
      upsert.run(keyOf(text), model, dimensions, blob, now, now);
    },
    pruneOlderThan(days) {
      const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
      return Number(prune.run(cutoff).changes);
    },
    size() {
      return count.get().n;
    },
  };
}
