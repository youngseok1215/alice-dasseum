import type { Product, ProductCategory } from '@/types/product';

type CreateProductInput = {
  name: string;
  brand?: string;
  category: ProductCategory;
  quantity?: number;
  openedAt?: string;
  expiresAt?: string;
  imageUri?: string;
};

type StoredProduct = {
  id: string;
  name: string;
  brand?: string;
  category: ProductCategory;
  quantity: number;
  openedAt?: string;
  expiresAt?: string;
  imageUri?: string;
  createdAt: string;
};

function calculateDday(expiresAt?: string) {
  if (!expiresAt) return null;
  const [year, month, day] = expiresAt.split('-').map(Number);
  const expiry = new Date(year, month - 1, day);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((expiry.getTime() - today.getTime()) / 86_400_000);
}

function apiBaseUrl() {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, '');
  if (!baseUrl) throw new Error('제품 저장 서버 주소가 설정되지 않았어요.');
  return baseUrl;
}

function resolveImageUri(imageUri?: string) {
  if (!imageUri) return undefined;
  return imageUri.startsWith('/') ? `${apiBaseUrl()}${imageUri}` : imageUri;
}

function toProduct(product: StoredProduct): Product {
  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    category: product.category,
    quantity: product.quantity,
    openedAt: product.openedAt ?? null,
    expiresAt: product.expiresAt ?? null,
    imageUri: resolveImageUri(product.imageUri),
    dday: calculateDday(product.expiresAt),
    createdAt: product.createdAt,
    registeredAt: product.createdAt.slice(0, 10),
    status: 'owned',
  };
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  const baseUrl = apiBaseUrl();

  const response = await fetch(`${baseUrl}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }).catch(() => {
    throw new Error('서버에 연결할 수 없어요. Wi-Fi와 서버 실행 상태를 확인해 주세요.');
  });

  const payload: { product?: StoredProduct; error?: string } = await response.json().catch(() => ({}));
  if (!response.ok || !payload.product) {
    throw new Error(payload.error || '제품을 저장하지 못했어요.');
  }

  return toProduct(payload.product);
}

export async function listProducts(): Promise<Product[]> {
  const baseUrl = apiBaseUrl();
  const response = await fetch(`${baseUrl}/api/products`).catch(() => {
    throw new Error('서버에 연결할 수 없어요.');
  });
  const payload: { products?: StoredProduct[]; error?: string } = await response.json().catch(() => ({}));
  if (!response.ok || !payload.products) throw new Error(payload.error || '제품 목록을 불러오지 못했어요.');
  return payload.products.map(toProduct);
}
