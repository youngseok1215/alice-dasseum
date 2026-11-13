import { useSyncExternalStore } from 'react';
import { mockProducts } from '@/data/mock-products';
import type { Product } from '@/types/product';

export type HoldRecord = { id: string; name: string; createdAt: string };
type State = { products: Product[]; recent: string[]; holds: HoldRecord[]; done: Product[] };
const initialDone: Product[] = [
  { id: 'done-cleanser', name: '약산성 클렌징폼 150ml', category: '화장품', openedAt: '2026-08-01', expiresAt: null, registeredAt: '2026-08-01', status: 'done', completedAt: '2026-11-10' },
  { id: 'done-handwash', name: '핸드워시 리필 500ml', category: '생활용품', openedAt: '2026-09-01', expiresAt: null, registeredAt: '2026-09-01', status: 'done', completedAt: '2026-11-05' },
  { id: 'done-lipbalm', name: '립밤 4.5g', category: '화장품', openedAt: '2026-07-01', expiresAt: null, registeredAt: '2026-07-01', status: 'done', completedAt: '2026-11-01' },
];
let state: State = {
  products: mockProducts,
  recent: ['데일리 선크림 SPF50+', '약산성 진정 토너'],
  holds: [
    { id: 'seed-hold-1', name: '데일리 선크림 SPF50+ 50ml', createdAt: '2026-11-08' },
    { id: 'seed-hold-2', name: '약산성 진정 토너 300ml', createdAt: '2026-11-03' },
  ],
  done: initialDone,
};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const update = (next: State) => { state = next; emit(); };

export function useAppStore() { return useSyncExternalStore((listener) => { listeners.add(listener); return () => listeners.delete(listener); }, () => state, () => state); }
export function addRecent(query: string) { update({ ...state, recent: [query, ...state.recent.filter((v) => v !== query)].slice(0, 5) }); }
export function removeRecent(query: string) { update({ ...state, recent: state.recent.filter((v) => v !== query) }); }
export function holdPurchase(name: string) { update({ ...state, holds: [{ id: String(Date.now()), name, createdAt: '2026-11-12' }, ...state.holds] }); }
export function markOpened(id: string) { update({ ...state, products: state.products.map((p) => p.id === id ? { ...p, openedAt: '2026-11-12' } : p) }); }
export function markDone(id: string) { const product = state.products.find((p) => p.id === id); if (!product) return; const done = { ...product, status: 'done' as const, completedAt: '2026-11-12' }; update({ ...state, products: state.products.filter((p) => p.id !== id), done: [done, ...state.done] }); }
