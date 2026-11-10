import type { Product } from '@/types/product';

export const mockProducts: Product[] = [
  {
    id: 'vitamin-d',
    name: '비타민D 2000IU',
    brand: '다씀 테스트',
    category: '영양제',
    openedAt: '2026-10-01',
    expiresAt: '2026-12-08',
    quantity: 1,
    daysLeft: 27,
    createdAt: '2026-11-01',
  },
  {
    id: 'moisture-cream',
    name: '수분 크림',
    category: '화장품',
    openedAt: '2026-09-10',
    expiresAt: '2027-03-10',
    quantity: 1,
    daysLeft: 119,
    createdAt: '2026-10-20',
  },
  {
    id: 'eye-drops',
    name: '인공눈물',
    category: '의약품',
    openedAt: '2026-11-02',
    expiresAt: '2027-01-15',
    quantity: 2,
    daysLeft: 65,
    createdAt: '2026-11-02',
  },
  {
    id: 'omega-3',
    name: '오메가3',
    category: '영양제',
    openedAt: '2026-10-11',
    expiresAt: '2027-05-01',
    quantity: 1,
    daysLeft: 171,
    createdAt: '2026-10-11',
  },
];

const aliases: Record<string, string[]> = {
  안약: ['인공눈물'],
  비타민: ['비타민'],
};

function normalizeProductName(value: string) {
  return value.toLowerCase().replace(/\s+/g, '').replace(/(mg|iu)/g, '');
}

export function findSimilarProducts(query: string) {
  const normalizedQuery = normalizeProductName(query);
  const keywords = aliases[query.trim()] ?? [normalizedQuery];

  return mockProducts.filter((product) => {
    const normalizedName = normalizeProductName(product.name);
    return keywords.some((keyword) => {
      const normalizedKeyword = normalizeProductName(keyword);
      return normalizedName.includes(normalizedKeyword) || normalizedKeyword.includes(normalizedName);
    });
  });
}

export const expirySoonCount = mockProducts.filter((product) =>
  typeof product.daysLeft === 'number' && product.daysLeft <= 90,
).length;

export function productStatus(product: Product) {
  if (typeof product.daysLeft === 'number') return `유통기한 D-${product.daysLeft}`;
  return '개봉일 확인 필요';
}
