import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  clearRecords as clearRemoteRecords,
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
  quantity?: number;
  memo?: string;
};

interface Store extends State {
  ready: boolean;
  setQuery: (q: string) => void;
  addRecent: (q: string) => void;
  removeRecent: (q: string) => void;
  hold: (p: { mode: CheckMode; query: string; verdict: Verdict; productId: string }) => Promise<void>;
  markDone: (id: string) => Promise<void>;
  undoDone: (id: string) => Promise<void>;
  openToday: (id: string) => Promise<void>;
  product: (id: string) => Product;
  /** 삭제됐거나 아직 불러오지 못한 제품인지 확인 — 화면에서 product() 전에 먼저 확인 */
  hasProduct: (id: string | undefined) => boolean;
  products: () => Product[];
  registerProduct: (form: ProductForm) => Promise<string>;
  updateProduct: (id: string, form: ProductForm) => Promise<void>;
  setProductQuantity: (id: string, quantity: number) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  refreshProducts: () => Promise<void>;
  /** 서버에서 제품·기록을 불러오지 못했을 때의 안내 문구 (성공하면 null) */
  syncError: string | null;
  /** 앱 시작 직후 첫 불러오기가 끝났는지 — 끝나기 전에는 '등록한 제품 없음'을 보여주지 않습니다. */
  synced: boolean;
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
  const [syncError, setSyncError] = useState<string | null>(null);
  const [synced, setSynced] = useState(false);
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

  // 실패하면 기존 목록은 그대로 두고 안내 문구만 남깁니다 (빈 목록으로 덮어쓰지 않음).
  const refreshProducts = useCallback(async () => {
    try {
      const [items, records] = await Promise.all([listProducts(), listRecords()]);
      setRemoteProducts(items);
      setRemoteRecords(records);
      setSyncError(null);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : '제품 목록을 불러오지 못했어요.');
      throw error;
    } finally {
      setSynced(true);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([listProducts(), listRecords()])
      .then(([items, records]) => {
        if (!active) return;
        setRemoteProducts(items);
        setRemoteRecords(records);
        setSyncError(null);
      })
      .catch((error) => {
        if (active) setSyncError(error instanceof Error ? error.message : '제품 목록을 불러오지 못했어요.');
      })
      .finally(() => { if (active) setSynced(true); });
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
  const hasProduct = useCallback((id: string | undefined) => Boolean(id) && (
    remoteProducts.some((item) => item.id === id) || s.registeredProducts.some((item) => item.id === id)
  ), [remoteProducts, s.registeredProducts]);
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
  const recordDate = useCallback((value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value.slice(0, 10).replace(/-/g, '.');
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('.');
  }, []);
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
  // '오늘 개봉했어요': 서버 제품이면 SQLite에 저장하고, 실패하면 예외를 던져 화면에서 안내합니다.
  const openToday = useCallback(async (id: string) => {
    if (remoteProducts.some((item) => item.id === id)) {
      const saved = await updateRemoteProduct(id, { openedAt: TODAY.replace(/\./g, '-') });
      setRemoteProducts((items) => items.map((item) => item.id === saved.id ? saved : item));
      setS((x) => {
        const { [id]: _drop, ...openedOverrides } = x.openedOverrides;
        return { ...x, openedOverrides };
      });
      return;
    }
    setS((x) => ({ ...x, openedOverrides: { ...x.openedOverrides, [id]: TODAY } }));
  }, [remoteProducts]);

  const registerProduct = useCallback(async (form: ProductForm) => {
    const saved = await createRemoteProduct({
      name: form.name.trim(),
      brand: form.brand || undefined,
      category: form.cat,
      openedAt: apiDate(form.opened),
      expiresAt: apiDate(form.expires),
      imageUri: form.imageUri,
      quantity: form.quantity ?? 1,
      memo: form.memo,
    });
    setRemoteProducts((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
    return saved.id;
  }, []);

  const updateProduct = useCallback(async (id: string, form: ProductForm) => {
    const isRemote = remoteProducts.some((item) => item.id === id);
    if (isRemote) {
      // 비운 날짜·메모는 null로 보내야 서버에서도 지워집니다 (undefined는 JSON에서 빠져 기존 값이 유지됨).
      const saved = await updateRemoteProduct(id, {
        name: form.name.trim(),
        brand: form.brand?.trim() || null,
        category: form.cat,
        openedAt: apiDate(form.opened) ?? null,
        expiresAt: apiDate(form.expires) ?? null,
        ...(form.imageUri !== undefined ? { imageUri: form.imageUri } : {}),
        quantity: form.quantity ?? product(id).quantity ?? 1,
        memo: form.memo?.trim() || null,
      });
      setS((x) => {
        const { [id]: _drop, ...openedOverrides } = x.openedOverrides;
        return { ...x, openedOverrides };
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
      quantity: form.quantity ?? product(id).quantity ?? 1,
      memo: form.memo ?? product(id).memo,
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

  const setProductQuantity = useCallback(async (id: string, quantity: number) => {
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 999) {
      throw new Error('수량은 1개부터 999개까지 입력해 주세요.');
    }
    // 수량만 보냅니다. 다른 필드를 함께 보내면 화면에만 있던 값(예: 로컬 개봉일)이 덮어쓸 수 있어요.
    const saved = await updateRemoteProduct(id, { quantity });
    setRemoteProducts((items) => items.map((item) => item.id === saved.id ? saved : item));
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    const isRemote = remoteProducts.some((item) => item.id === id);
    if (isRemote) {
      await deleteRemoteProduct(id);
      setRemoteProducts((current) => current.filter((item) => item.id !== id));
      // 서버와 같이: 기록은 남기고 제품 연결만 끊음
      setRemoteRecords((current) => current.map((record) => record.productId === id ? { ...record, productId: undefined } : record));
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
    await clearRemoteRecords();
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
    hasProduct,
    products,
    registerProduct,
    updateProduct,
    setProductQuantity,
    deleteProduct,
    refreshProducts,
    syncError,
    synced,
    setNotifyEnabled,
    setCameraPermission,
    markAlertRead,
    markAlertsSeen,
    finishOnboarding,
    setDevPhotoVerdict,
    setDevRegisterFail,
    reset,
  }), [s, ready, holdList, dones, completed, setQuery, addRecent, removeRecent, hold, markDone, undoDone, openToday, product, hasProduct, products, registerProduct, updateProduct, setProductQuantity, deleteProduct, refreshProducts, syncError, synced, setNotifyEnabled, setCameraPermission, markAlertRead, markAlertsSeen, finishOnboarding, setDevPhotoVerdict, setDevRegisterFail, reset]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const value = useContext(Ctx);
  if (!value) throw new Error('useApp must be used inside AppStoreProvider');
  return value;
}

