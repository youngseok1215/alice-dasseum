export type ProductImageSuggestion = {
  url: string;
  thumbnail: string;
  title: string;
};

function apiBaseUrl() {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, '');
  if (!baseUrl) throw new Error('제품 저장 서버 주소가 설정되지 않았어요.');
  return baseUrl;
}

export async function searchProductImages(
  source: { query?: string; image?: string },
  signal?: AbortSignal,
) {
  const response = await fetch(`${apiBaseUrl()}/api/products/images/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(source),
    signal,
  }).catch(() => {
    throw new Error('추천 사진을 불러오지 못했어요.');
  });
  const payload: {
    configured?: boolean;
    images?: ProductImageSuggestion[];
    error?: string;
  } = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || '추천 사진을 불러오지 못했어요.');
  return {
    configured: payload.configured !== false,
    images: payload.images ?? [],
  };
}

export async function saveProductImage(source: { image: string } | { url: string }) {
  const response = await fetch(`${apiBaseUrl()}/api/products/images`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(source),
  }).catch(() => {
    throw new Error('사진 저장 서버에 연결할 수 없어요.');
  });
  const payload: { imageUri?: string; error?: string } = await response.json().catch(() => ({}));
  if (!response.ok || !payload.imageUri) {
    throw new Error(payload.error || '사진을 저장하지 못했어요.');
  }
  return payload.imageUri;
}
