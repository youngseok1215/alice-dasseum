export const PRODUCT_CATEGORIES = ['화장품', '영양제', '의약품', '생활용품'] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export type Product = {
  id: string;
  name: string;
  brand?: string;
  category: ProductCategory;
  openedAt: string | null;
  expiresAt: string | null;
  imageUri?: string;
  quantity?: number;
  daysLeft?: number;
  dday?: number | null;
  createdAt?: string;
  registeredAt: string;
  memo?: string;
  status: 'owned' | 'done';
  completedAt?: string | null;
  recommendReason?: string;
};

export type ProductMatch = Product & { match: 'same' | 'similar' };
