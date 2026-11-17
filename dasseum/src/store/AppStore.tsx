import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  createHold as createRemoteHold,
  createProduct as createRemoteProduct,
  deleteProduct as deleteRemoteProduct,
  listProducts,
  listRecords,
  markProductDone,
  undoProductDone,
  updateProduct as updateRemoteProduct,
  type ActivityRecord,
} from '@/api/products';
import {
  SEED,
  TODAY,
  TODAY_SHORT,
  ddayOf,
  reasonOf,
  type Category,
  type CheckMode,
  type DoneRecord,
  type HoldRecord,
  type PhotoVerdict,
  type Product,
  type RecentCheck,
  type Verdict,
} from '@/data/products';

const KEY = 'dasseum-app-v15-empty-state';
type State = typeof SEED;
type ProductForm = {
  name: string;
  cat: Category;
  opened: string;
  expires: string;
  manual?: boolean;
  brand?: string;
  imageUri?: string;
};

interface Store extends State {
  ready: boolean;
  setQuery: (q: string) => void;
  addRecent: (q: string) => void;
  removeRecent: (q: string) => void;
  hold: (p: { mode: CheckMode; query: string; verdict: Verdict; productId: string }) => Promise<void>;
  markDone: (id: string) => Promise<void>;
  undoDone: (id: string) => Promise<void>;
  openToday: (id: string) => void;
  product: (id: string) => Product;
  products: () => Product[];
  registerProduct: (form: ProductForm) => Promise<string>;
  updateProduct: (id: string, form: ProductForm) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  refreshProducts: () => Promise<void>;
  setNotifyEnabled: (value: boolean) => void;
  setCameraPermission: (value: State['cameraPermission']) => void;
  markAlertRead: (id: string) => void;
  markAlertsSeen: () => void;
  finishOnboarding: () => void;
  setDevPhotoVerdict: (v: PhotoVerdict) => void;
  setDevRegisterFail: (v: State['devRegisterFail']) => void;
  reset: () => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

function apiDate(value: string | null | undefined) {
  return value ? value.replace(/\./g, '-') : undefined;
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<State>(SEED);
  const [ready, setReady] = useState(false);
  const [remoteProducts, setRemoteProducts] = useState<Product[]>([]);
  const [remoteRecords, setRemoteRecords] = useState<ActivityRecord[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => { if (raw) setS({ ...SEED, ...JSON.parse(raw) }); })
      .catch(() => {})
      .finally(() => { loaded.current = true; setReady(true); });
  }, []);
  useEffect(() => {
    if (loaded.current) AsyncStorage.setItem(KEY, JSON.stringify(s)).catch(() => {});
  }, [s]);

  const refreshProducts = useCallback(async () => {
    const [items, records] = await Promise.all([listProducts(), listRecords()]);
    setRemoteProducts(items);
    setRemoteRecords(records);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([listProducts(), listRecords()])
      .then(([items, records]) => {
        if (!active) return;
        setRemoteProducts(items);
        setRemoteRecords(records);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const findProduct = useCallback((state: State, id: string): Product => {
    const base = remoteProducts.find((p) => p.id === id)
      ?? state.registeredProducts.find((p) => p.id === id);
    if (!base) throw new Error('등록된 제품을 찾을 수 없어요.');
    const edit = state.productEdits?.[base.id];
    const opened = state.openedOverrides[base.id];
    const current = { ...base, ...(edit || {}), ...(opened ? { opened } : {}) };
    const withDday = { ...current, dday: ddayOf(current.expires) };
    return { ...withDday, reason: reasonOf(withDday) || withDday.reason };
  }, [remoteProducts]);

  const product = useCallback((id: string) => findProduct(s, id), [findProduct, s]);
  const products = useCallback(() => {
    const byId = new Map<string, Product>();
    remoteProducts.forEach((item) => byId.set(item.id, product(item.id)));
    s.registeredProducts.forEach((item) => { if (!byId.has(item.id)) byId.set(item.id, product(item.id)); });
    return [...byId.values()];
  }, [product, remoteProducts, s.registeredProducts]);

  const setQuery = useCallback((query: string) => setS((x) => ({ ...x, query })), []);
  const addRecent = useCallback((q: string) => setS((x) => ({
    ...x,
    recents: [{ q, date: TODAY_SHORT } as RecentCheck, ...x.recents.filter((r) => r.q !== q)].slice(0, 5),
  })), []);
  const removeRecent = useCallback((q: string) => setS((x) => ({ ...x, recents: x.recents.filter((r) => r.q !== q) })), []);
  const recordDate = useCallback((value: string) => value.slice(0, 10).replace(/-/g, '.'), []);
  const completed = useMemo(
    () => remoteProducts.filter((item) => item.status === 'done').map((item) => item.id),
    [remoteProducts],
  );
  const holdList = useMemo<HoldRecord[]>(() => remoteRecords
    .filter((record) => record.type === 'hold')
    .map((record, index) => ({
      name: record.query || record.name,
      match: record.match === 'same' ? '동일' : '유사',
      date: recordDate(record.createdAt),
      isNew: index === 0,
    })), [recordDate, remoteRecords]);
  const dones = useMemo<DoneRecord[]>(() => remoteRecords
    .filter((record) => record.type === 'done' && record.category)
    .map((record, index) => ({
      name: record.name,
      cat: record.category as Category,
      date: recordDate(record.createdAt),
      isNew: index === 0,
    })), [recordDate, remoteRecords]);

  const hold = useCallback(async ({ mode, query, verdict, productId }: { mode: CheckMode; query: string; verdict: Verdict; productId: string }) => {
    if (verdict === 'none') throw new Error('보류할 보유 제품이 없어요.');
    const p = findProduct(s, productId);
    const records = await createRemoteHold({
      productId,
      query: mode === 'photo' ? p.name : query,
      verdict,
    });
    setRemoteRecords(records);
  }, [findProduct, s]);
  const markDone = useCallback(async (id: string) => {
    const result = await markProductDone(id);
    setRemoteProducts((current) => current.map((item) => item.id === id ? result.product : item));
    setRemoteRecords(result.records);
  }, []);
  const undoDone = useCallback(async (id: string) => {
    const result = await undoProductDone(id);
    setRemoteProducts((current) => current.map((item) => item.id === id ? result.product : item));
    setRemoteRecords(result.records);
  }, []);
  const openToday = useCallback((id: string) => setS((x) => ({
    ...x,
    openedOverrides: { ...x.openedOverrides, [id]: TODAY },
  })), []);

  const registerProduct = useCallback(async (form: ProductForm) => {
    const saved = await createRemoteProduct({
      name: form.name.trim(),
      brand: form.brand || undefined,
      category: form.cat,
      openedAt: apiDate(form.opened),
      expiresAt: apiDate(form.expires),
      imageUri: form.imageUri,
    });
    setRemoteProducts((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
    return saved.id;
  }, []);

  const updateProduct = useCallback(async (id: string, form: ProductForm) => {
    const isRemote = remoteProducts.some((item) => item.id === id);
    if (isRemote) {
      const saved = await updateRemoteProduct(id, {
        name: form.name.trim(),
        brand: form.brand || product(id).brand || undefined,
        category: form.cat,
        openedAt: apiDate(form.opened),
        expiresAt: apiDate(form.expires),
        imageUri: form.imageUri ?? product(id).imageUri,
      });
      setRemoteProducts((current) => current.map((item) => item.id === saved.id ? saved : item));
      return;
    }
    const date = (value: string) => value ? value.replace(/-/g, '.') : null;
    const patch: Partial<Product> = {
      name: form.name.trim(),
      cat: form.cat,
      opened: date(form.opened),
      expires: date(form.expires),
      dday: ddayOf(form.expires),
    };
    setS((x) => {
      const { [id]: _drop, ...openedOverrides } = x.openedOverrides;
      if (x.registeredProducts.some((item) => item.id === id)) {
        return {
          ...x,
          openedOverrides,
          registeredProducts: x.registeredProducts.map((item) => item.id === id ? { ...item, ...patch } : item),
        };
      }
      return { ...x, openedOverrides, productEdits: { ...x.productEdits, [id]: { ...x.productEdits[id], ...patch } } };
    });
  }, [product, remoteProducts]);

  const deleteProduct = useCallback(async (id: string) => {
    const isRemote = remoteProducts.some((item) => item.id === id);
    if (isRemote) {
      await deleteRemoteProduct(id);
      setRemoteProducts((current) => current.filter((item) => item.id !== id));
      setRemoteRecords((current) => current.filter((record) => record.productId !== id));
    }
    setS((x) => ({
      ...x,
      registeredProducts: x.registeredProducts.filter((item) => item.id !== id),
      completed: x.completed.includes(id) ? x.completed : [...x.completed, id],
    }));
  }, [remoteProducts]);

  const setNotifyEnabled = useCallback((notifyEnabled: boolean) => setS((x) => ({ ...x, notifyEnabled })), []);
  const setCameraPermission = useCallback((cameraPermission: State['cameraPermission']) => setS((x) => ({ ...x, cameraPermission })), []);
  const markAlertRead = useCallback((id: string) => setS((x) => ({
    ...x,
    readAlerts: x.readAlerts.includes(id) ? x.readAlerts : [...x.readAlerts, id],
  })), []);
  const markAlertsSeen = useCallback(() => setS((x) => ({ ...x, alertsSeen: true })), []);
  const finishOnboarding = useCallback(() => setS((x) => ({ ...x, onboarded: true })), []);
  const setDevPhotoVerdict = useCallback((devPhotoVerdict: PhotoVerdict) => setS((x) => ({ ...x, devPhotoVerdict })), []);
  const setDevRegisterFail = useCallback((devRegisterFail: State['devRegisterFail']) => setS((x) => ({ ...x, devRegisterFail })), []);
  const reset = useCallback(async () => {
    await Promise.all(remoteProducts.map((item) => deleteRemoteProduct(item.id)));
    setRemoteProducts([]);
    setRemoteRecords([]);
    setS(SEED);
    await AsyncStorage.setItem(KEY, JSON.stringify(SEED));
  }, [remoteProducts]);

  const value = useMemo(() => ({
    ...s,
    ready,
    holdList,
    dones,
    completed,
    setQuery,
    addRecent,
    removeRecent,
    hold,
    markDone,
    undoDone,
    openToday,
    product,
    products,
    registerProduct,
    updateProduct,
    deleteProduct,
    refreshProducts,
    setNotifyEnabled,
    setCameraPermission,
    markAlertRead,
    markAlertsSeen,
    finishOnboarding,
    setDevPhotoVerdict,
    setDevRegisterFail,
    reset,
  }), [s, ready, holdList, dones, completed, setQuery, addRecent, removeRecent, hold, markDone, undoDone, openToday, product, products, registerProduct, updateProduct, deleteProduct, refreshProducts, setNotifyEnabled, setCameraPermission, markAlertRead, markAlertsSeen, finishOnboarding, setDevPhotoVerdict, setDevRegisterFail, reset]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const value = useContext(Ctx);
  if (!value) throw new Error('useApp must be used inside AppStoreProvider');
  return value;
}

