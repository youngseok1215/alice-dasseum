import type { Product } from '@/types/product';

export const mockProducts: Product[] = [
  { id: 'toner', name: '약산성 진정 토너 300ml', brand: '라온스킨', category: '화장품', openedAt: '2026-05-02', expiresAt: '2026-11-19', registeredAt: '2026-05-02', status: 'owned', daysLeft: 7, dday: 7, recommendReason: '사용기한 D-7' },
  { id: 'eye', name: '인공눈물 일회용 30개입', brand: '맑은눈', category: '의약품', openedAt: null, expiresAt: '2026-11-10', registeredAt: '2026-06-14', status: 'owned', daysLeft: -2, dday: -2, recommendReason: '사용기한이 지났어요' },
  { id: 'multi', name: '멀티비타민 60정', brand: '하루웰', category: '영양제', openedAt: '2026-08-01', expiresAt: '2026-12-05', registeredAt: '2026-07-28', status: 'owned', daysLeft: 23, dday: 23, recommendReason: '사용기한 D-23' },
  { id: 'sun', name: '데일리 선크림 SPF50+ 50ml', brand: '선데이즈', category: '화장품', openedAt: '2026-09-10', expiresAt: '2027-03-10', registeredAt: '2026-09-10', status: 'owned', daysLeft: 118, dday: 118, recommendReason: '개봉 2개월째' },
  { id: 'vitd', name: '온데이 비타민D3 1000IU 90정', brand: '온데이', category: '영양제', openedAt: '2026-09-03', expiresAt: '2027-06-30', registeredAt: '2026-09-03', status: 'owned', daysLeft: 230, dday: 230, memo: '주방 선반 보관' },
  { id: 'shampoo', name: '퍼퓸 샴푸 1L', brand: '배스데이', category: '생활용품', openedAt: '2026-10-20', expiresAt: null, registeredAt: '2026-10-20', status: 'owned', dday: null },
];

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, '').replace(/(mg|iu|정|개입)/g, '');
export function findSimilarProducts(query: string) {
  const q = normalize(query);
  if (!q) return [];
  if (q.includes('안약')) return mockProducts.filter((p) => p.id === 'eye');
  if (q.includes('비타민d') || q.includes('비타민디')) return mockProducts.filter((p) => p.id === 'vitd');
  return mockProducts.filter((p) => normalize(p.name).includes(q) || q.includes(normalize(p.name)));
}
export const expirySoonCount = mockProducts.filter((p) => typeof p.dday === 'number' && p.dday <= 30).length;
export function productStatus(product: Product) {
  if (typeof product.dday === 'number') return product.dday < 0 ? `D+${Math.abs(product.dday)}` : `D-${product.dday}`;
  return product.openedAt ? '사용 중' : '미개봉';
}
