// 백엔드 공통 요청: 배포 주소(EXPO_PUBLIC_API_URL), 요청별 타임아웃, 한국어 오류, 오류 종류 구분.
// API 키는 여기 없습니다 — 키는 백엔드 환경변수에만 두고, 앱 번들에는 EXPO_PUBLIC_API_URL만 들어갑니다.

export type ApiErrorKind = 'config' | 'network' | 'timeout' | 'server';

export class ApiError extends Error {
  constructor(message: string, readonly kind: ApiErrorKind, readonly status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

/** 서버에 닿지 못한 오류(주소·Wi-Fi·서버 꺼짐·응답 지연)인지 — 이때는 '다시 시도'를 안내합니다. */
export function isConnectionError(error: unknown) {
  return error instanceof ApiError && (error.kind === 'network' || error.kind === 'timeout' || error.kind === 'config');
}

export function apiBaseUrl() {
  const value = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, '');
  if (!value) throw new ApiError('서버 주소가 설정되지 않았어요. EXPO_PUBLIC_API_URL을 확인해 주세요.', 'config');
  return value;
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** 기본 15초. AI 요청은 백엔드 재시도 시간을 고려해 더 길게 줍니다. */
  timeoutMs?: number;
  /** 화면을 떠날 때 요청을 취소하는 signal. 취소되면 AbortError를 그대로 던집니다. */
  signal?: AbortSignal;
  /** 서버에 연결하지 못했을 때 보여줄 앞 문장 (예: '제품 목록을 불러오지 못했어요.') */
  failMessage: string;
};

export async function apiRequest<T>(path: string, { method = 'GET', body, timeoutMs = 15_000, signal, failMessage }: RequestOptions) {
  const url = `${apiBaseUrl()}${path}`;
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  const onAbort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      if (timedOut) throw new ApiError(`${failMessage} 서버 응답이 늦어요. 잠시 후 다시 시도해 주세요.`, 'timeout');
      throw new ApiError(`${failMessage} 서버에 연결할 수 없어요. 인터넷 연결을 확인해 주세요.`, 'network');
    }
    const payload = await response.json().catch(() => ({})) as T & { error?: string };
    return { status: response.status, ok: response.ok, payload };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

/** 응답이 실패면 서버가 준 한국어 메시지(없으면 fallback)로 ApiError를 던집니다. */
export function failIf(result: { status: number; ok: boolean; payload: { error?: string } }, condition: boolean, fallback: string): asserts condition {
  if (!condition) throw new ApiError(result.payload.error || fallback, 'server', result.status);
}
