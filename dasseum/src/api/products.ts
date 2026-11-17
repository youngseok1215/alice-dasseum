import { calculateDday, type Category, type Product } from '@/data/products';

export type ProductSuggestion = {
  name: string | null;
  brand: string | null;
  category: Category | null;
  expiresAt: string | null;
};

export type CreateProductInput = {
  name: string;
  brand?: string;
  category: Category;
  quantity?: number;
  openedAt?: string;
  expiresAt?: string;
  imageUri?: string;
};

export type PurchaseAnalysis = {
  query: string;
  verdict: 'same' | 'similar' | 'none';
  matches: { productId: string; similarity: number }[];
  decision: 'BUY' | 'CHECK_FIRST' | 'HOLD';
  title: string;
  reason: string;
  provider: 'Elice' | 'Gemini' | 'rules';
  embeddingProvider: 'Gemini';
};

type StoredProduct = {
  id: string;
  name: string;
  brand?: string;
  category: Category;
  quantity: number;
  openedAt?: string;
  expiresAt?: string;
  imageUri?: string;
  createdAt: string;
};

let pendingPhoto: string | undefined;
let pendingExpiryPhoto: string | undefined;
let pendingSuggestion: ProductSuggestion | undefined;
let pendingPurchaseAnalysis: PurchaseAnalysis | undefined;

function apiBaseUrl() {
  const value = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, '');
  if (!value) throw new Error('EXPO_PUBLIC_API_URL에 백엔드 주소를 설정해 주세요.');
  return value;
}

function dotted(value?: string) {
  return value ? value.replace(/-/g, '.') : null;
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
    imageUri: product.imageUri?.startsWith('/') ? `${baseUrl}${product.imageUri}` : product.imageUri,
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

export async function analyzePurchase(query: string, purpose?: string, signal?: AbortSignal) {
  pendingPurchaseAnalysis = undefined;
  const response = await fetch(`${apiBaseUrl()}/api/purchase-analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, purpose }),
    signal,
  }).catch(() => {
    throw new Error('AI 분석 서버에 연결할 수 없어요. 서버 주소와 Wi-Fi를 확인해 주세요.');
  });
  const payload = await response.json().catch(() => ({})) as Partial<PurchaseAnalysis> & { error?: string };
  if (response.status === 503) throw new Error(payload.error || '백엔드에 Gemini API 키를 설정해 주세요.');
  if (!response.ok || !payload.verdict) throw new Error(payload.error || '유사 제품을 분석하지 못했어요.');
  pendingPurchaseAnalysis = payload as PurchaseAnalysis;
  return pendingPurchaseAnalysis;
}

export async function recognizePhoto(image: string, signal?: AbortSignal) {
  const response = await fetch(`${apiBaseUrl()}/api/products/recognize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image }),
    signal,
  }).catch(() => {
    throw new Error('AI 서버에 연결할 수 없어요. 서버 주소와 Wi-Fi를 확인해 주세요.');
  });

  const payload: { suggestion?: ProductSuggestion; error?: string } = await response.json().catch(() => ({}));
  if (response.status === 503) throw new Error('서버에 AI 인식 키가 설정되지 않았어요.');
  if (response.status === 413) throw new Error('사진이 너무 커요. 더 작은 사진으로 다시 시도해 주세요.');
  if (response.status === 429) throw new Error('AI 요청 한도에 도달했어요. 잠시 후 다시 시도해 주세요.');
  if (!response.ok || !payload.suggestion) throw new Error(payload.error || '사진을 인식하지 못했어요.');
  return payload.suggestion;
}

export async function saveProductImage(image: string) {
  const response = await fetch(`${apiBaseUrl()}/api/products/images`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image }),
  }).catch(() => {
    throw new Error('사진 저장 서버에 연결할 수 없어요.');
  });
  const payload: { imageUri?: string; error?: string } = await response.json().catch(() => ({}));
  if (!response.ok || !payload.imageUri) throw new Error(payload.error || '사진을 저장하지 못했어요.');
  return payload.imageUri;
}

export async function createProduct(input: CreateProductInput) {
  const response = await fetch(`${apiBaseUrl()}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }).catch(() => {
    throw new Error('제품 저장 서버에 연결할 수 없어요.');
  });
  const payload: { product?: StoredProduct; error?: string } = await response.json().catch(() => ({}));
  if (!response.ok || !payload.product) throw new Error(payload.error || '제품을 저장하지 못했어요.');
  return toProduct(payload.product);
}

export async function listProducts() {
  const response = await fetch(`${apiBaseUrl()}/api/products`).catch(() => {
    throw new Error('제품 목록 서버에 연결할 수 없어요.');
  });
  const payload: { products?: StoredProduct[]; error?: string } = await response.json().catch(() => ({}));
  if (!response.ok || !payload.products) throw new Error(payload.error || '제품 목록을 불러오지 못했어요.');
  return payload.products.map(toProduct);
}

export async function updateProduct(id: string, input: CreateProductInput) {
  const response = await fetch(`${apiBaseUrl()}/api/products/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }).catch(() => {
    throw new Error('제품 수정 서버에 연결할 수 없어요.');
  });
  const payload: { product?: StoredProduct; error?: string } = await response.json().catch(() => ({}));
  if (!response.ok || !payload.product) throw new Error(payload.error || '제품을 수정하지 못했어요.');
  return toProduct(payload.product);
}

export async function deleteProduct(id: string) {
  const response = await fetch(`${apiBaseUrl()}/api/products/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }).catch(() => {
    throw new Error('제품 삭제 서버에 연결할 수 없어요.');
  });
  const payload: { deleted?: boolean; error?: string } = await response.json().catch(() => ({}));
  if (!response.ok || !payload.deleted) throw new Error(payload.error || '제품을 삭제하지 못했어요.');
}
