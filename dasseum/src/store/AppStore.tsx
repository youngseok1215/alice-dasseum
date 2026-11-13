// 앱 상태 — 프로토타입 App()의 state + localStorage 저장을 Context + AsyncStorage로 옮김
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { PRODUCTS, SEED, TODAY, TODAY_SHORT, type CheckMode, type DoneRecord, type HoldRecord, type Product, type RecentCheck, type Verdict } from '@/data/products';

const KEY = 'dasseum-app-v1';

type State = typeof SEED;

interface Store extends State {
  ready: boolean;
  setQuery: (q: string) => void;
  addRecent: (q: string) => void;
  removeRecent: (q: string) => void;
  hold: (p: { mode: CheckMode; query: string; verdict: Verdict; productId: string }) => void;
  markDone: (id: string) => void;
  openToday: (id: string) => void;
  product: (id: string) => Product;
  reset: () => void;
}

const Ctx = createContext<Store | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<State>(SEED);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => { if (raw) setS({ ...SEED, ...JSON.parse(raw) }); })
      .catch(() => {})
      .finally(() => { loaded.current = true; setReady(true); });
  }, []);
  useEffect(() => { if (loaded.current) AsyncStorage.setItem(KEY, JSON.stringify(s)).catch(() => {}); }, [s]);

  const setQuery = useCallback((query: string) => setS((x) => ({ ...x, query })), []);
  const addRecent = useCallback((q: string) => setS((x) => ({ ...x, recents: [{ q, date: TODAY_SHORT } as RecentCheck, ...x.recents.filter((r) => r.q !== q)].slice(0, 5) })), []);
  const removeRecent = useCallback((q: string) => setS((x) => ({ ...x, recents: x.recents.filter((r) => r.q !== q) })), []);
  const hold = useCallback(({ mode, query, verdict, productId }: { mode: CheckMode; query: string; verdict: Verdict; productId: string }) => {
    const P = PRODUCTS[productId];
    const rec: HoldRecord = { name: mode === 'photo' ? P.name : query, match: verdict === 'same' ? '동일' : '유사', date: TODAY, isNew: true };
    setS((x) => ({ ...x, holdList: [rec, ...x.holdList.map((h) => ({ ...h, isNew: false }))] }));
  }, []);
  const markDone = useCallback((id: string) => {
    setS((x) => {
      if (x.completed.includes(id)) return x;
      const P = PRODUCTS[id];
      const rec: DoneRecord = { name: P.name, cat: P.cat, date: TODAY, isNew: true };
      return { ...x, dones: [rec, ...x.dones.map((d) => ({ ...d, isNew: false }))], completed: [...x.completed, id] };
    });
  }, []);
  const openToday = useCallback((id: string) => setS((x) => ({ ...x, openedOverrides: { ...x.openedOverrides, [id]: TODAY } })), []);
  const product = useCallback((id: string): Product => {
    const P = PRODUCTS[id] ?? PRODUCTS.vitd;
    const o = s.openedOverrides[P.id];
    return o ? { ...P, opened: o } : P;
  }, [s.openedOverrides]);
  const reset = useCallback(() => setS(SEED), []);

  const value = useMemo(() => ({ ...s, ready, setQuery, addRecent, removeRecent, hold, markDone, openToday, product, reset }), [s, ready, setQuery, addRecent, removeRecent, hold, markDone, openToday, product, reset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside AppStoreProvider');
  return v;
}
