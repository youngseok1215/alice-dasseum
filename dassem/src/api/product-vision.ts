import type { ProductCategory } from '@/types/product';

export type ProductSuggestion = {
  name: string | null;
  brand: string | null;
  category: ProductCategory | null;
  expiresAt: string | null;
};

let pendingPhoto: string | undefined;

export function setRecognitionPhoto(photo: string) {
  pendingPhoto = photo;
}

export function getRecognitionPhoto() {
  return pendingPhoto;
}

export function clearRecognitionPhoto(photo: string) {
  if (pendingPhoto === photo) pendingPhoto = undefined;
}

export async function recognizePhoto(image: string, signal?: AbortSignal) {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, '');
  if (!baseUrl) throw new Error('EXPO_PUBLIC_API_URL에 사진 인식 서버 주소를 설정해 주세요.');

  const response = await fetch(`${baseUrl}/api/products/recognize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image }),
    signal,
  }).catch(() => {
    throw new Error('서버에 연결할 수 없어요. 서버 주소와 Wi-Fi를 확인해 주세요.');
  });

  if (response.status === 503) throw new Error('서버에 사진 인식 서비스가 설정되지 않았어요.');
  if (response.status === 413) throw new Error('사진이 너무 커요. 다시 찍어 주세요.');
  if (response.status === 429) throw new Error('사진 인식 요청 한도에 도달했어요. 잠시 후 다시 시도해 주세요.');
  if (!response.ok) throw new Error('사진을 읽지 못했어요. 다시 찍거나 직접 입력해 주세요.');

  const { suggestion }: { suggestion: ProductSuggestion } = await response.json();
  return suggestion;
}
