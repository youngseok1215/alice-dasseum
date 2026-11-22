import { apiBaseUrl, apiRequest, failIf } from '@/api/client';
import { calculateDday, type Category, type Product } from '@/data/products';

export type ProductSuggestion = {
  name: string | null;
  brand: string | null;
  category: Category | null;
  expiresAt: string | null;
  /** 라벨에서 읽은 용량·함량 (서버가 name에도 붙여서 보냄) */
  spec?: string | null;
};

export type CreateProductInput = {
  name: string;
  brand?: string;
  category: Category;
  quantity?: number;
  openedAt?: string;
  expiresAt?: string;
  imageUri?: string;
  memo?: string;
};

export type ActivityRecord = {
  id: string;
  type: 'hold' | 'done';
  productId?: string;
  name: string;
  category?: Category;
  match?: 'same' | 'similar';
  query?: string;
  createdAt: string;
};

export type ComparisonInput = { productId: string; ownedDetails: string; targetDetails: string };

export type PurchaseAnalysis = {
  productProfiles?: { owned?: ProductProfile; target?: ProductProfile };
  comparison?: ComparisonInput;
  query: string;
  verdict: 'same' | 'similar' | 'none';
  matches: { productId: string; similarity: number }[];
  /** 판정된 보유 제품과 용량·함량이 다른 항목 (예: 보유 1000IU · 구매 예정 2000IU) */
  specDifference?: { unit: string; query: string; owned: string }[];
  matchedBy?: 'name' | 'embedding' | 'profile' | 'none';
  decision: 'BUY' | 'CHECK_FIRST' | 'HOLD';
  title: string;
  reason: string;
  provider: 'Elice' | 'Gemini' | 'rules';
  embeddingProvider: 'Gemini';
};

type ProductProfile = { id: string; name: string; facts: string[]; sources: { label: string; url?: string }[] };

type StoredProduct = {
  id: string;
  name: string;
  brand?: string;
  category: Category;
  quantity: number;
  openedAt?: string;
  expiresAt?: string;
  imageUri?: string;
  memo?: string;
  createdAt: string;
  status: 'owned' | 'done';
  completedAt?: string;
};

let pendingPhoto: string | undefined;
let pendingExpiryPhoto: string | undefined;
let pendingSuggestion: ProductSuggestion | undefined;
let pendingPurchaseAnalysis: PurchaseAnalysis | undefined;


function dotted(value?: string) {
  return value ? value.replace(/-/g, '.') : null;
}

/** 화면용 절대 주소(`http://서버/api/images/x.jpg`)를 서버 저장용 상대 경로(`/api/images/x.jpg`)로 되돌립니다. */
function toStoredImageUri<T extends string | null | undefined>(uri: T): T {
  if (!uri) return uri;
  const local = /^https?:\/\/[^/]+(\/api\/images\/[0-9a-f-]+\.(?:jpg|jpeg|png|webp))$/i.exec(uri);
  return (local ? local[1] : uri) as T;
}

function toProduct(product: StoredProduct): Product {
  const baseUrl = apiBaseUrl();
  return {
    id: product.id,
    name: product.name,
    brand: product.brand || '',
    cat: product.category,
    opened: dotted(product.openedAt),
    expires: dotted(product.expiresAt),
    dday: calculateDday(product.expiresAt),
    registered: dotted(product.createdAt.slice(0, 10)) || '',
    // 예전에 `http://192.168.x.x:3001/api/images/...`처럼 절대 주소로 저장된 사진도 현재 서버 주소로 보여줍니다.
    imageUri: (() => {
      const stored = toStoredImageUri(product.imageUri);
      return stored?.startsWith('/') ? `${baseUrl}${stored}` : stored;
    })(),
    quantity: product.quantity,
    memo: product.memo,
    status: product.status,
    completedAt: product.completedAt,
  };
}

export function setPendingPhoto(photo: string) {
  pendingPhoto = photo;
  pendingSuggestion = undefined;
}

export function getPendingPhoto() {
  return pendingPhoto;
}

export function setPendingExpiryPhoto(photo: string) {
  pendingExpiryPhoto = photo;
}

export function getPendingExpiryPhoto() {
  return pendingExpiryPhoto;
}

export function setPendingSuggestion(suggestion: ProductSuggestion) {
  pendingSuggestion = suggestion;
}

export function getPendingSuggestion() {
  return pendingSuggestion;
}

export function clearPendingRegistration() {
  pendingPhoto = undefined;
  pendingExpiryPhoto = undefined;
  pendingSuggestion = undefined;
}

export function getPendingPurchaseAnalysis() {
  return pendingPurchaseAnalysis;
}

export async function analyzePurchase(query: string, purpose?: string, signal?: AbortSignal, comparison?: ComparisonInput) {
  pendingPurchaseAnalysis = undefined;
  const result = await apiRequest<Partial<PurchaseAnalysis>>('/api/purchase-analysis', {
    // 서버 최악: 임베딩(10초×2)·판단 문구(12초×2, 스키마 거부 시 +12초) ≈ 80초 → 여유 있게 100초
    method: 'POST', body: { query, purpose, comparison }, signal, timeoutMs: 100_000, failMessage: 'AI 분석을 하지 못했어요.',
  });
  failIf(result, result.ok && Boolean(result.payload.verdict), '유사 제품을 분석하지 못했어요.');
  pendingPurchaseAnalysis = result.payload as PurchaseAnalysis;
  return pendingPurchaseAnalysis;
}

export async function recognizePhoto(image: string, signal?: AbortSignal) {
  const result = await apiRequest<{ suggestion?: ProductSuggestion }>('/api/products/recognize', {
    // 서버 최악 약 46초 + 사진 업로드 시간 → 75초
    method: 'POST', body: { image }, signal, timeoutMs: 75_000, failMessage: '사진을 인식하지 못했어요.',
  });
  if (result.status === 413) failIf(result, false, '사진이 너무 커요. 더 작은 사진으로 다시 시도해 주세요.');
  failIf(result, result.ok && Boolean(result.payload.suggestion), '사진을 인식하지 못했어요.');
  return result.payload.suggestion as ProductSuggestion;
}

export async function saveProductImage(image: string) {
  const result = await apiRequest<{ imageUri?: string }>('/api/products/images', {
    method: 'POST', body: { image }, timeoutMs: 30_000, failMessage: '사진을 저장하지 못했어요.',
  });
  failIf(result, result.ok && Boolean(result.payload.imageUri), '사진을 저장하지 못했어요.');
  return result.payload.imageUri as string;
}

export async function createProduct(input: CreateProductInput) {
  const result = await apiRequest<{ product?: StoredProduct }>('/api/products', {
    method: 'POST', body: { ...input, imageUri: toStoredImageUri(input.imageUri) }, failMessage: '제품을 저장하지 못했어요.',
  });
  failIf(result, result.ok && Boolean(result.payload.product), '제품을 저장하지 못했어요.');
  return toProduct(result.payload.product as StoredProduct);
}

export async function listProducts() {
  const result = await apiRequest<{ products?: StoredProduct[] }>('/api/products', { failMessage: '제품 목록을 불러오지 못했어요.' });
  failIf(result, result.ok && Array.isArray(result.payload.products), '제품 목록을 불러오지 못했어요.');
  return (result.payload.products as StoredProduct[]).map(toProduct);
}

/** 수정 요청: 선택 필드에 null을 보내면 서버에서 그 값을 비웁니다. 보내지 않은 필드는 유지됩니다. */
export type UpdateProductInput = Partial<{
  name: string;
  brand: string | null;
  category: Category;
  quantity: number;
  openedAt: string | null;
  expiresAt: string | null;
  imageUri: string | null;
  memo: string | null;
}>;

export async function updateProduct(id: string, input: UpdateProductInput) {
  const body = 'imageUri' in input ? { ...input, imageUri: toStoredImageUri(input.imageUri) } : input;
  const result = await apiRequest<{ product?: StoredProduct }>(`/api/products/${encodeURIComponent(id)}`, {
    method: 'PATCH', body, failMessage: '제품을 수정하지 못했어요.',
  });
  failIf(result, result.ok && Boolean(result.payload.product), '제품을 수정하지 못했어요.');
  return toProduct(result.payload.product as StoredProduct);
}

export async function deleteProduct(id: string) {
  const result = await apiRequest<{ deleted?: boolean }>(`/api/products/${encodeURIComponent(id)}`, {
    method: 'DELETE', failMessage: '제품을 삭제하지 못했어요.',
  });
  failIf(result, result.ok && Boolean(result.payload.deleted), '제품을 삭제하지 못했어요.');
}

export async function listRecords() {
  const result = await apiRequest<{ records?: ActivityRecord[] }>('/api/records', { failMessage: '활동 기록을 불러오지 못했어요.' });
  failIf(result, result.ok && Array.isArray(result.payload.records), '활동 기록을 불러오지 못했어요.');
  return result.payload.records as ActivityRecord[];
}

/** 설정 > '모든 데이터 초기화' 전용: 다씀·구매 보류 기록 전체 삭제 */
export async function clearRecords() {
  const result = await apiRequest<{ deleted?: number }>('/api/records', { method: 'DELETE', failMessage: '활동 기록을 지우지 못했어요.' });
  failIf(result, result.ok, '활동 기록을 지우지 못했어요.');
}

type DoneResponse = { product?: StoredProduct; records?: ActivityRecord[] };

export async function markProductDone(id: string) {
  const result = await apiRequest<DoneResponse>(`/api/products/${encodeURIComponent(id)}/done`, {
    method: 'POST', body: {}, failMessage: '다씀으로 기록하지 못했어요.',
  });
  failIf(result, result.ok && Boolean(result.payload.product && result.payload.records), '다씀으로 기록하지 못했어요.');
  return { product: toProduct(result.payload.product as StoredProduct), records: result.payload.records as ActivityRecord[] };
}

export async function undoProductDone(id: string) {
  const result = await apiRequest<DoneResponse>(`/api/products/${encodeURIComponent(id)}/done`, {
    method: 'DELETE', failMessage: '다씀 기록을 되돌리지 못했어요.',
  });
  failIf(result, result.ok && Boolean(result.payload.product && result.payload.records), '다씀 기록을 되돌리지 못했어요.');
  return { product: toProduct(result.payload.product as StoredProduct), records: result.payload.records as ActivityRecord[] };
}

export async function createHold(input: { productId: string; query: string; verdict: 'same' | 'similar' }) {
  const result = await apiRequest<{ records?: ActivityRecord[] }>('/api/holds', {
    method: 'POST', body: input, failMessage: '구매 보류를 기록하지 못했어요.',
  });
  failIf(result, result.ok && Array.isArray(result.payload.records), '구매 보류를 기록하지 못했어요.');
  return result.payload.records as ActivityRecord[];
}
