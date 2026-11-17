// 외부 API(Gemini·카카오·Google Vision) 공통 호출: 요청마다 타임아웃, 일시적 실패만 제한적으로 재시도.
// 무한 재시도를 막기 위해 retries 최대값을 2로 고정합니다.

const RETRYABLE_STATUS = new Set([500, 502, 503, 504]);
const MAX_RETRIES = 2;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @param {string | URL} url
 * @param {RequestInit} init  signal은 넣지 마세요 — 시도마다 타임아웃 signal을 새로 만듭니다.
 * @param {{ timeoutMs?: number, retries?: number, label?: string }} [options]
 * @returns {Promise<Response>} 마지막 시도의 응답 (5xx여도 그대로 반환하므로 호출부에서 response.ok 확인)
 */
export async function fetchWithRetry(url, init = {}, { timeoutMs = 15_000, retries = 1, label = 'external API' } = {}) {
  const attempts = Math.min(Math.max(retries, 0), MAX_RETRIES) + 1;
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const isLast = attempt === attempts;
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
      // 429(요청 한도)는 바로 다시 보내도 대부분 실패하므로 재시도하지 않습니다.
      if (!RETRYABLE_STATUS.has(response.status) || isLast) return response;
      console.warn(`[${label}] HTTP ${response.status}, retrying (${attempt}/${attempts - 1})`);
      await response.body?.cancel().catch(() => {});
    } catch (error) {
      lastError = error;
      const reason = error?.name === 'TimeoutError' ? `timeout ${timeoutMs}ms` : error?.name ?? 'Error';
      if (isLast) break;
      console.warn(`[${label}] ${reason}, retrying (${attempt}/${attempts - 1})`);
    }
    await sleep(500 * attempt);
  }
  throw lastError ?? new Error(`${label} request failed`);
}

/** 타임아웃으로 끝난 오류인지 (사용자 메시지 구분용) */
export function isTimeout(error) {
  return error?.name === 'TimeoutError' || error?.name === 'AbortError';
}
