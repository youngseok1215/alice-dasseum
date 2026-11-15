// 앱 상태 — 프로토타입 App()의 state + localStorage 저장을 Context + AsyncStorage로 옮김
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { deleteProduct as deleteRemoteProduct, listProducts, updateProduct as updateRemoteProduct } from '@/api/products';
import { calculateDday, PRODUCTS, recommendationReason, SEED, TODAY, TODAY_SHORT, type CheckMode, type DoneRecord, type HoldRecord, type Product, type RecentCheck, type Verdict } from '@/data/products';

const KEY = 'dasseum-app-v1';

type State = typeof SEED;

interface Store extends State {
  ready: boolean;
  productIds: string[];
  setQuery: (q: string) => void;
  addRecent: (q: string) => void;
  removeRecent: (q: string) => void;
  hold: (p: { mode: CheckMode; query: string; verdict: Verdict; productId: string }) => void;
  markDone: (id: string) => void;
  openToday: (id: string) => void;
  product: (id: string) => Product;
  addProduct: (product: Product) => void;
  updateOwnedProduct: (product: Product) => Promise<void>;
  deleteOwnedProduct: (id: string) => Promise<void>;
  refreshProducts: () => Promise<void>;
  reset: () => void;
}

const Ctx = createContext<Store | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<State>(SEED);
  const [ready, setReady] = useState(false);
  const [remoteProducts, setRemoteProducts] = useState<Product[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => { if (raw) setS({ ...SEED, ...JSON.parse(raw) }); })
      .catch(() => {})
      .finally(() => { loaded.current = true; setReady(true); });
  }, []);
  useEffect(() => { if (loaded.current) AsyncStorage.setItem(KEY, JSON.stringify(s)).catch(() => {}); }, [s]);

  const refreshProducts = useCallback(async () => {
    try {
      setRemoteProducts(await listProducts());
    } catch {
      // 백엔드가 꺼져 있어도 디자인 목업 데이터로 앱은 계속 동작합니다.
    }
  }, []);
  useEffect(() => {
    let active = true;
    listProducts()
      .then((items) => { if (active) setRemoteProducts(items); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const products = useMemo(() => ({
    ...PRODUCTS,
    ...Object.fromEntries(remoteProducts.map((product) => [product.id, product])),
  }), [remoteProducts]);
  const productIds = useMemo(() => [...remoteProducts.map((product) => product.id), ...Object.keys(PRODUCTS)]
    .filter((id) => !s.removedProductIds.includes(id)), [remoteProducts, s.removedProductIds]);
  const addProduct = useCallback((product: Product) => {
    setRemoteProducts((current) => [product, ...current.filter((item) => item.id !== product.id)]);
  }, []);
  const updateOwnedProduct = useCallback(async (next: Product) => {
    const isRemote = remoteProducts.some((item) => item.id === next.id);
    if (isRemote) {
      const saved = await updateRemoteProduct(next.id, {
        name: next.name,
        brand: next.brand || undefined,
        category: next.cat,
        openedAt: next.opened?.replace(/\./g, '-') || undefined,
        expiresAt: next.expires?.replace(/\./g, '-') || undefined,
        imageUri: next.imageUri,
      });
      setRemoteProducts((current) => current.map((item) => item.id === saved.id ? saved : item));
      return;
    }
    setS((current) => ({
      ...current,
      productOverrides: { ...current.productOverrides, [next.id]: next },
    }));
  }, [remoteProducts]);
  const deleteOwnedProduct = useCallback(async (id: string) => {
    const isRemote = remoteProducts.some((item) => item.id === id);
    if (isRemote) {
      await deleteRemoteProduct(id);
      setRemoteProducts((current) => current.filter((item) => item.id !== id));
    }
    setS((current) => {
      const productOverrides = { ...current.productOverrides };
      delete productOverrides[id];
      const openedOverrides = { ...current.openedOverrides };
      delete openedOverrides[id];
      return {
        ...current,
        productOverrides,
        openedOverrides,
        completed: current.completed.filter((item) => item !== id),
        removedProductIds: [...new Set([...current.removedProductIds, id])],
      };
    });
  }, [remoteProducts]);

  const setQuery = useCallback((query: string) => setS((x) => ({ ...x, query })), []);
  const addRecent = useCallback((q: string) => setS((x) => ({ ...x, recents: [{ q, date: TODAY_SHORT } as RecentCheck, ...x.recents.filter((r) => r.q !== q)].slice(0, 5) })), []);
  const removeRecent = useCallback((q: string) => setS((x) => ({ ...x, recents: x.recents.filter((r) => r.q !== q) })), []);
  const hold = useCallback(({ mode, query, verdict, productId }: { mode: CheckMode; query: string; verdict: Verdict; productId: string }) => {
    const P = products[productId] ?? PRODUCTS.vitd;
    const rec: HoldRecord = { name: mode === 'photo' ? P.name : query, match: verdict === 'same' ? '동일' : '유사', date: TODAY, isNew: true };
    setS((x) => ({ ...x, holdList: [rec, ...x.holdList.map((h) => ({ ...h, isNew: false }))] }));
  }, [products]);
  const markDone = useCallback((id: string) => {
    setS((x) => {
      if (x.completed.includes(id)) return x;
      const P = products[id] ?? PRODUCTS.vitd;
      const rec: DoneRecord = { name: P.name, cat: P.cat, date: TODAY, isNew: true };
      return { ...x, dones: [rec, ...x.dones.map((d) => ({ ...d, isNew: false }))], completed: [...x.completed, id] };
    });
  }, [products]);
  const openToday = useCallback((id: string) => setS((x) => ({ ...x, openedOverrides: { ...x.openedOverrides, [id]: TODAY } })), []);
  const product = useCallback((id: string): Product => {
    const P = s.productOverrides[id] ?? products[id] ?? PRODUCTS.vitd;
    const o = s.openedOverrides[P.id];
    const current = o ? { ...P, opened: o } : P;
    const withDday = { ...current, dday: calculateDday(current.expires) };
    return { ...withDday, reason: recommendationReason(withDday) };
  }, [products, s.openedOverrides, s.productOverrides]);
  const reset = useCallback(() => setS(SEED), []);

  const value = useMemo(() => ({ ...s, ready, productIds, setQuery, addRecent, removeRecent, hold, markDone, openToday, product, addProduct, updateOwnedProduct, deleteOwnedProduct, refreshProducts, reset }), [s, ready, productIds, setQuery, addRecent, removeRecent, hold, markDone, openToday, product, addProduct, updateOwnedProduct, deleteOwnedProduct, refreshProducts, reset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside AppStoreProvider');
  return v;
}
