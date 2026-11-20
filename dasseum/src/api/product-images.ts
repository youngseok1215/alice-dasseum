import { apiRequest, failIf } from '@/api/client';

export type ProductImageSuggestion = {
  url: string;
  thumbnail: string;
  title: string;
};

export async function searchProductImages(
  source: { query?: string; image?: string },
  signal?: AbortSignal,
) {
  const result = await apiRequest<{ configured?: boolean; images?: ProductImageSuggestion[] }>('/api/products/images/search', {
    method: 'POST', body: source, signal, timeoutMs: 25_000, failMessage: '추천 사진을 불러오지 못했어요.',
  });
  failIf(result, result.ok, '추천 사진을 불러오지 못했어요.');
  return {
    configured: result.payload.configured !== false,
    images: result.payload.images ?? [],
  };
}

export async function saveProductImage(source: { image: string } | { url: string }) {
  // 외부 사진 다운로드(서버 10초) + 업로드 시간을 고려
  const result = await apiRequest<{ imageUri?: string }>('/api/products/images', {
    method: 'POST', body: source, timeoutMs: 30_000, failMessage: '사진을 저장하지 못했어요.',
  });
  failIf(result, result.ok && Boolean(result.payload.imageUri), '사진을 저장하지 못했어요.');
  return result.payload.imageUri as string;
}
