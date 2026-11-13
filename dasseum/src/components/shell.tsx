// 화면 틀(상태바·안전영역), 하단 탭, 토스트, 내비게이션 도우미
import { router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, ND } from '@/theme/tokens';
import { Icon, T, type IconName } from './ui';

/* ---------- 내비게이션 (프로토타입 go/back/reset 대응) ---------- */
export const nav = {
  /** 스택을 비우고 해당 화면 하나만 남김 — 프로토타입 go(name, null, false, true) */
  reset(path: '/home' | '/check' | '/items') {
    if (router.canDismiss()) router.dismissAll();
    router.replace(path);
  },
  back() {
    if (router.canGoBack()) router.back();
  },
};

/* ---------- Toast ---------- */
const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
const TABBED = ['/home', '/check', '/items'];

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const toast = useCallback((m: string) => {
    setMsg(m);
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 250, easing: Easing.bezier(0.2, 0, 0, 1), useNativeDriver: ND }).start();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2000);
  }, [opacity]);
  const insets = useSafeAreaInsets();
  const path = usePathname();
  const tabbed = TABBED.includes(path);
  // 프로토타입: 폰 하단에서 탭 화면 100px / 그 외 132px (홈 인디케이터 28px 포함)
  const bottom = (tabbed ? 72 : 104) + insets.bottom;
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      {msg && (
        <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 20, right: 20, bottom, opacity, zIndex: 50 }}>
          <View style={{ minHeight: 54, borderRadius: 12, overflow: 'hidden', paddingVertical: 11, paddingLeft: 26, paddingRight: 16, justifyContent: 'center' }}>
            {/* Wanted Toast: backdrop blur(64px) + #1B1C1E 52% + 민트 5% — 블러된 밝은 배경을 단색으로 근사 */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(247,250,248,0.94)' }]} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: C.dark, opacity: 0.52 }]} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: C.mint, opacity: 0.05 }]} />
            <T style={{ fontSize: 15, lineHeight: 22, letterSpacing: 0.15, fontFamily: 'Pretendard-SemiBold', color: '#FFFFFF', opacity: 0.88, paddingVertical: 5 }}>{msg}</T>
          </View>
        </Animated.View>
      )}
    </ToastCtx.Provider>
  );
}

/* ---------- Screen 틀 ---------- */
export function Screen({ children, dark, tab }: { children: React.ReactNode; dark?: boolean; tab?: TabKey }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: dark ? C.dark : C.bg, paddingTop: insets.top }}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      {children}
      {tab && <BottomNav active={tab} />}
    </View>
  );
}

/** 탭 화면용 스크롤 (스크롤바 숨김 · .dsm-noscroll) */
export function Scroll(props: ScrollViewProps) {
  return <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" {...props} />;
}

/* ---------- 하단 탭 ---------- */
export type TabKey = 'home' | 'check' | 'items';
const TABS: [TabKey | 'settings', IconName, string][] = [['home', 'home', '홈'], ['check', 'search', '구매 전 확인'], ['items', 'storage', '내 물품'], ['settings', 'setting', '설정']];

export function BottomNav({ active }: { active: TabKey }) {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const onTab = (k: string) => {
    if (k === 'settings') return toast('설정은 이번 테스트 범위가 아니에요');
    nav.reset(('/' + k) as '/home');
  };
  return (
    <View style={{ backgroundColor: C.white, paddingTop: 6, paddingBottom: insets.bottom, flexDirection: 'row' }}>
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: C.line }} />
      {TABS.map(([k, ic, l]) => {
        const on = active === k;
        const color = on ? C.ink : 'rgba(55,56,60,0.45)';
        const name = (on && ic !== 'search' && ic !== 'storage' ? ic + 'Fill' : ic) as IconName;
        return (
          <Pressable key={k} onPress={() => onTab(k)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={l}
            style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: 4 }}>
            <Icon name={name} size={24} color={color} />
            <T style={{ fontSize: 11, lineHeight: 14, fontFamily: 'Pretendard-Medium', letterSpacing: 0.33, color }}>{l}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 마운트 후 일정 시간 뒤 실행 (언마운트 시 취소) */
export function useTimeout(fn: () => void, ms: number) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => { const t = setTimeout(() => ref.current(), ms); return () => clearTimeout(t); }, [ms]);
}
