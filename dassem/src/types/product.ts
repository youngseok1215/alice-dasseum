export const PRODUCT_CATEGORIES = ['화장품', '영양제', '의약품', '생활용품'] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export type Product = {
  id: string;
  name: string;
  brand?: string;
  category: ProductCategory;
  openedAt?: string;
  expiresAt?: string;
  imageUri?: string;
  quantity: number;
  daysLeft?: number;
  createdAt: string;
};

export type ProductMatch = Product & { match: 'same' | 'similar' };
