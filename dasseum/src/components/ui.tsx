// 공통 UI — 프로토타입 proto/screens.jsx의 DBadge, DButton, TextBtn, IconBtn, TopBar, ProdImg, Mascot, Card,
// SectionHead, ActionArea, BottomNav를 React Native로 옮긴 것. 수치는 프로토타입과 동일합니다.
import { Image } from 'expo-image';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { G, Path } from 'react-native-svg';
import { ICONS } from '@/theme/icons';
import { BADGE, C, type BadgeTone, tx } from '@/theme/tokens';

/* ---------- Text ---------- */
export function T({ style, ...rest }: TextProps & { style?: StyleProp<TextStyle> }) {
  return <Text allowFontScaling={false} lineBreakStrategyIOS="hangul-word" textBreakStrategy="simple" {...rest} style={style} />;
}

/* ---------- Icon ---------- */
export type IconName = keyof typeof ICONS | 'settingFill';
export function Icon({ name, size = 24, color = C.ink, style }: { name: IconName; size?: number; color?: string; style?: StyleProp<ViewStyle> }) {
  const paths = ICONS[name === 'settingFill' ? 'setting' : name] ?? [];
  return (
    <View style={[{ width: size, height: size }, style]} pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {paths.map((p, i) => (
          <G key={i} transform={`translate(${p.t})`}>
            <Path d={p.d} fill={color} fillRule={p.rule} />
          </G>
        ))}
      </Svg>
    </View>
  );
}

/* ---------- inset 1px 테두리 (box-shadow: inset 0 0 0 1px) — 레이아웃에 영향 없음 ---------- */
export function Hair({ radius = 0, color = C.line, width = 1 }: { radius?: number; color?: string; width?: number }) {
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, borderWidth: width, borderColor: color }]} />;
}

/* ---------- Pressable + 눌림 오버레이 (.dsm-press: hover 5% · active 12%) ---------- */
export function Press({ onPress, style, radius = 0, children, disabled, accessibilityLabel }: {
  onPress?: () => void; style?: StyleProp<ViewStyle>; radius?: number; children?: React.ReactNode; disabled?: boolean; accessibilityLabel?: string;
}) {
  return (
    <Pressable onPress={disabled ? undefined : onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled: !!disabled }} style={[{ borderRadius: radius }, style]}>
      {(state) => {
        const { pressed } = state;
        const hovered = (state as { hovered?: boolean }).hovered;
        return (
          <>
            {children}
            {!disabled && (pressed || hovered) && (
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, backgroundColor: C.ink, opacity: pressed ? 0.12 : 0.05 }]} />
            )}
          </>
        );
      }}
    </Pressable>
  );
}

/* ---------- Badge ---------- */
export function DBadge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  const [bg, fg] = BADGE[tone];
  return (
    <View style={{ height: 22, paddingHorizontal: 7, borderRadius: 6, backgroundColor: bg, justifyContent: 'center' }}>
      <T numberOfLines={1} style={{ fontSize: 12, lineHeight: 16, fontFamily: 'Pretendard-SemiBold', color: fg }}>{children}</T>
    </View>
  );
}
export function ddayBadge(d: number | null | undefined) {
  if (d === null || d === undefined) return <DBadge tone="neutral">기한 미입력</DBadge>;
  if (d < 0) return <DBadge tone="neg">기한 지남</DBadge>;
  if (d === 0) return <DBadge tone="neg">오늘까지</DBadge>;
  if (d <= 30) return <DBadge tone="warn">D-{d}</DBadge>;
  return <DBadge tone="neutral">D-{d}</DBadge>;
}

/* ---------- Button (Wanted DS ButtonButton lg/md) ---------- */
export function DButton({ label, onPress, variant = 'solid', icon, disabled, size = 'lg' }: {
  label: string; onPress?: () => void; variant?: 'solid' | 'outlined'; icon?: IconName; disabled?: boolean; size?: 'lg' | 'md';
}) {
  const solid = variant === 'solid';
  const lg = size === 'lg';
  const radius = lg ? 12 : 10;
  const bg = solid ? (disabled ? C.disabledBg : C.mint) : 'transparent';
  const color = disabled ? C.assist : solid ? C.onPrimary : '#171719';
  const textStyle: TextStyle = lg
    ? { fontSize: 16, lineHeight: 24, letterSpacing: 0.096 }
    : { fontSize: 15, lineHeight: 22, letterSpacing: 0.15 };
  return (
    <Press onPress={onPress} disabled={disabled} radius={radius} accessibilityLabel={label}
      style={{ height: lg ? 48 : 40, paddingHorizontal: lg ? 28 : 20, backgroundColor: bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
      {!solid && <Hair radius={radius} color={C.lineNeutral} />}
      {icon && <View style={{ width: 18, alignItems: 'center', marginRight: 6, overflow: 'visible' }}><Icon name={icon} size={20} color={color} /></View>}
      <T numberOfLines={1} style={[textStyle, { fontFamily: solid ? 'Pretendard-SemiBold' : 'Pretendard-Medium', color }]}>{label}</T>
    </Press>
  );
}

export function TextBtn({ children, onPress, color }: { children: React.ReactNode; onPress?: () => void; color?: string }) {
  return (
    <Press onPress={onPress} radius={8} style={{ paddingVertical: 8, paddingHorizontal: 4 }}>
      <T style={tx(14, 20, 600, color || C.neutral)}>{children}</T>
    </Press>
  );
}

export function IconBtn({ name, onPress, label, color, dot }: { name: IconName; onPress?: () => void; label?: string; color?: string; dot?: boolean }) {
  return (
    <Press onPress={onPress} radius={12} accessibilityLabel={label} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} size={24} color={color || C.ink} />
      {dot && <View style={{ position: 'absolute', top: 10, right: 10, width: 6, height: 6, borderRadius: 3, backgroundColor: C.negative }} />}
    </Press>
  );
}

export function TopBar({ title, onBack, right }: { title?: string; onBack?: () => void; right?: React.ReactNode }) {
  return (
    <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 4 }}>
      {onBack ? <IconBtn name="chevronLeft" label="뒤로가기" onPress={onBack} /> : <View style={{ width: 12 }} />}
      <T style={[tx(18, 26, 600), { flex: 1 }]}>{title}</T>
      {right}
    </View>
  );
}

export function ProdImg({ size = 56, radius = 12 }: { size?: number; radius?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' }}>
      <Hair radius={radius} />
      <Icon name="image" size={Math.max(16, Math.round(size / 3))} color={C.imageIcon} />
    </View>
  );
}

const MASCOT = {
  smile: require('../../assets/images/mascot/smile.png'),
  search: require('../../assets/images/mascot/search.png'),
  done: require('../../assets/images/mascot/done.png'),
  hold: require('../../assets/images/mascot/hold.png'),
};
/** 마스코트 PNG는 배경(#F7FAF8)과 multiply 합성을 미리 적용해 두었습니다 (프로토타입 mix-blend-mode: multiply와 동일 결과). */
export function Mascot({ kind, size }: { kind: keyof typeof MASCOT; size: number }) {
  return <Image source={MASCOT[kind]} contentFit="contain" style={{ width: size, height: size }} accessibilityIgnoresInvertColors />;
}

export function Card({ children, style, onPress, tone }: { children?: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; tone?: 'mint' | 'cream' }) {
  const bg = tone === 'mint' ? C.card : tone === 'cream' ? C.cream : C.white;
  const inner = (
    <>
      {!tone && <Hair radius={16} />}
      {children}
    </>
  );
  if (onPress) return <Press onPress={onPress} radius={16} style={[{ backgroundColor: bg }, style]}>{inner}</Press>;
  return <View style={[{ backgroundColor: bg, borderRadius: 16 }, style]}>{inner}</View>;
}

export function SectionHead({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 8, minHeight: action ? 36 : undefined }}>
      <T style={tx(17, 24, 600)}>{title}</T>
      {action ? <TextBtn onPress={onAction}>{action}</TextBtn> : null}
    </View>
  );
}

/** 하단 고정 버튼 영역 — 기기 홈 인디케이터 영역(safe area)까지 배경을 채웁니다. */
export function ActionArea({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return <View style={{ gap: 8, paddingTop: 12, paddingHorizontal: 20, paddingBottom: 8 + insets.bottom, backgroundColor: C.bg }}>{children}</View>;
}

/** 가로 구분선 (box-shadow inset 0 1px 0 / 0 -1px 0 대체) */
export function Line({ at }: { at: 'top' | 'bottom' }) {
  return <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, [at]: 0, height: 1, backgroundColor: C.line }} />;
}

export const isWeb = Platform.OS === 'web';
