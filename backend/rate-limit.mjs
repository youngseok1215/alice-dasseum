// 메모리 기반 요청 제한 (고정 창이 아닌 '최근 N분' 슬라이딩 방식).
// 서버 1대(SQLite) 구조라 메모리로 충분합니다. 서버를 재시작하면 카운트가 초기화됩니다.

export function createRateLimiter({ windowMs, max }) {
  const hits = new Map();

  // 오래된 키 정리 (메모리 누수 방지)
  const sweep = setInterval(() => {
    const cutoff = Date.now() - windowMs;
    for (const [key, times] of hits) {
      while (times.length && times[0] <= cutoff) times.shift();
      if (!times.length) hits.delete(key);
    }
  }, Math.min(windowMs, 60_000));
  sweep.unref();

  return {
    max,
    windowMs,
    /** @returns {{ ok: true } | { ok: false, retryAfterSeconds: number }} */
    hit(key) {
      const now = Date.now();
      const cutoff = now - windowMs;
      const times = hits.get(key) ?? [];
      while (times.length && times[0] <= cutoff) times.shift();
      if (times.length >= max) {
        return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((times[0] + windowMs - now) / 1000)) };
      }
      times.push(now);
      hits.set(key, times);
      return { ok: true };
    },
  };
}

/** 환경변수의 양의 정수, 없거나 잘못되면 기본값 */
export function envLimit(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}
