// 다씀 공통 RN 컴포넌트 (디자인 기준 구현 예시)
// 아이콘은 프로젝트에서 쓰는 아이콘 라이브러리로 교체하세요. 디자인은 Wanted DS 아이콘(24 grid, 라운드) 기준입니다.
import React from 'react';
import { Pressable, View, Text, TextInput, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Image } from 'expo-image';
import { colors, status, type, radius, layout, fonts, shadow, interaction } from './tokens';

type IconRender = (props: { size: number; color: string }) => React.ReactNode;

/* Button — solid(Primary, 민트) / outlined(Assistive) */
export function Button({ label, onPress, variant = 'solid', size = 'lg', disabled, icon }: {
  label: string; onPress?: () => void; variant?: 'solid' | 'outlined'; size?: 'lg' | 'md'; disabled?: boolean; icon?: IconRender;
}) {
  const solid = variant === 'solid';
  const h = size === 'lg' ? layout.buttonLg : layout.buttonMd;
  return (
    <Pressable disabled={disabled} onPress={onPress} accessibilityRole="button" accessibilityState={{ disabled }}
      style={({ pressed }) => [s.btn, { height: h, borderRadius: size === 'lg' ? radius.lg : radius.md },
        solid ? { backgroundColor: disabled ? colors.fillNormal : pressed ? colors.primaryPressed : colors.primary }
              : { backgroundColor: pressed ? `rgba(23,23,25,${interaction.pressed})` : colors.white, borderWidth: 1, borderColor: colors.lineNeutral }]}>
      {icon?.({ size: 20, color: colors.labelNeutral })}
      <Text style={[s.btnText, { fontSize: size === 'lg' ? 16 : 15 }, { color: disabled ? colors.labelAssistive : solid ? colors.onPrimary : colors.labelNeutral }]}>{label}</Text>
    </Pressable>
  );
}

/* TextButton */
export function TextButton({ label, onPress, color = colors.labelNeutral }: { label: string; onPress?: () => void; color?: string }) {
  return <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => [{ paddingVertical: 8, paddingHorizontal: 4, borderRadius: radius.sm, opacity: pressed ? 0.6 : 1 }]}><Text style={[s.label, { color, fontFamily: fonts.semibold }]}>{label}</Text></Pressable>;
}

/* Card — tone: default(화이트+헤어라인) / mint / cream */
export function Card({ children, tone = 'default', onPress, style }: { children: React.ReactNode; tone?: 'default' | 'mint' | 'cream'; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  const bg = tone === 'mint' ? colors.mintCard : tone === 'cream' ? colors.cream : colors.white;
  const base = [s.card, { backgroundColor: bg }, tone === 'default' && s.hairline, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && { opacity: 0.88 }]}>{children}</Pressable>;
}

/* Badge — 상태/카테고리 */
export type BadgeTone = keyof Omit<typeof status, 'negativeDot'>;
export function Badge({ tone, label }: { tone: BadgeTone; label: string }) {
  const t = status[tone];
  return <View style={[s.badge, { backgroundColor: t.bg }]}><Text style={[s.badgeText, { color: t.fg }]}>{label}</Text></View>;
}
export function DdayBadge({ dday }: { dday: number | null }) {
  if (dday === null) return <Badge tone="neutral" label="기한 미입력" />;
  if (dday < 0) return <Badge tone="neg" label="기한 지남" />;
  if (dday === 0) return <Badge tone="neg" label="오늘까지" />;
  if (dday <= 30) return <Badge tone="warn" label={`D-${dday}`} />;
  return <Badge tone="neutral" label={`D-${dday}`} />;
}

/* Chip — 카테고리 필터 */
export function Chip({ label, count, selected, onPress }: { label: string; count?: number; selected?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityState={{ selected }} style={[s.chip, selected ? { backgroundColor: colors.mint } : [s.hairlineStrong, { backgroundColor: colors.white }]]}>
      <Text style={[s.label, { fontFamily: selected ? fonts.bold : fonts.semibold, color: selected ? colors.labelNormal : colors.labelNeutral }]}>{label}</Text>
      {count !== undefined && <Text style={[s.caption, { fontFamily: fonts.semibold, color: selected ? colors.labelNormal : colors.labelAlternative }]}>{count}</Text>}
    </Pressable>
  );
}

/* SearchInput — 구매 전 확인 검색창 */
export function SearchInput({ value, onChangeText, onSubmit, leading, clearIcon }: { value: string; onChangeText: (v: string) => void; onSubmit: () => void; leading?: IconRender; clearIcon?: IconRender }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <View style={[s.input, shadow.field, { borderWidth: focus ? 2 : 1, borderColor: focus ? colors.point : colors.lineNeutral }]}>
      {leading?.({ size: 20, color: colors.labelAlternative })}
      <TextInput value={value} onChangeText={onChangeText} onSubmitEditing={onSubmit} returnKeyType="search" onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        placeholder="제품명이나 브랜드를 입력하세요" placeholderTextColor={colors.labelAssistive} style={[s.body1, { flex: 1, color: colors.labelNormal, fontFamily: fonts.regular }]} />
      {!!value && <Pressable accessibilityLabel="지우기" hitSlop={8} onPress={() => onChangeText('')}>{clearIcon?.({ size: 20, color: colors.labelAssistive })}</Pressable>}
    </View>
  );
}

/* InfoBanner — AI 참고용 고지 */
export function InfoBanner({ children, icon }: { children: React.ReactNode; icon?: IconRender }) {
  return <View style={s.banner}>{icon?.({ size: 18, color: colors.labelNeutral })}<Text style={[s.caption, { flex: 1, color: colors.labelNeutral, lineHeight: 19, letterSpacing: 0.1 }]}>{children}</Text></View>;
}

/* Mascot — 공식 이미지 전용. 형태·색 변경 금지 */
const MASCOT = {
  smile: require('../assets/character/mascot-smile.png'),
  search: require('../assets/character/mascot-search.png'),
  hold: require('../assets/character/mascot-hold.png'),
  done: require('../assets/character/mascot-done.png'),
};
export function Mascot({ kind, size }: { kind: keyof typeof MASCOT; size: number }) {
  // 웹 프로토타입은 흰 배경 PNG를 mix-blend-mode: multiply로 임시 처리. RN에는 해당 기능이 없으므로 투명 PNG로 교체 필요.
  return <Image source={MASCOT[kind]} style={{ width: size, height: size }} contentFit="contain" accessibilityIgnoresInvertColors />;
}

/* ProductThumb — 제품 사진(없으면 크림 플레이스홀더) */
export function ProductThumb({ uri, size = 56, r = radius.lg, placeholderIcon }: { uri?: string; size?: number; r?: number; placeholderIcon?: IconRender }) {
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: r }} contentFit="cover" />;
  return <View style={[{ width: size, height: size, borderRadius: r, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' }, s.hairline]}>{placeholderIcon?.({ size: Math.max(16, Math.round(size / 3)), color: colors.imageIcon })}</View>;
}

/* TopBar */
export function TopBar({ title, onBack, right, backIcon }: { title?: string; onBack?: () => void; right?: React.ReactNode; backIcon?: IconRender }) {
  return (
    <View style={s.topBar}>
      {onBack ? <Pressable accessibilityLabel="뒤로가기" onPress={onBack} style={s.iconBtn}>{backIcon?.({ size: 24, color: colors.labelNormal })}</Pressable> : <View style={{ width: 12 }} />}
      <Text style={[s.heading, { flex: 1 }]}>{title}</Text>
      {right}
    </View>
  );
}

/* ActionArea — 하단 고정 버튼 영역 (SafeArea 하단 패딩은 화면에서 추가) */
export function ActionArea({ children }: { children: React.ReactNode }) {
  return <View style={s.actionArea}>{children}</View>;
}

const s = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 28, alignSelf: 'stretch' },
  btnText: { fontFamily: fonts.semibold, lineHeight: 24 },
  card: { borderRadius: radius.card, ...shadow.card },
  hairline: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.lineNormal },
  hairlineStrong: { borderWidth: 1, borderColor: colors.lineNeutral },
  badge: { height: layout.badge, paddingHorizontal: 7, borderRadius: radius.xs, justifyContent: 'center', alignSelf: 'flex-start' },
  badgeText: { ...type.badge, fontFamily: fonts.semibold },
  chip: { height: layout.chip, paddingHorizontal: 14, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', gap: 4 },
  input: { height: layout.input, borderRadius: radius.lg, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 14, paddingRight: 8 },
  banner: { flexDirection: 'row', gap: 8, padding: 12, paddingHorizontal: 14, borderRadius: radius.lg, backgroundColor: colors.cream },
  topBar: { height: layout.topBarHeight, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 4 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg },
  actionArea: { gap: 8, paddingHorizontal: layout.screenX, paddingTop: 12, paddingBottom: 8, backgroundColor: colors.bg },
  heading: { ...type.heading, fontFamily: fonts.semibold, color: colors.labelNormal },
  body1: { ...type.body1 },
  label: { ...type.label },
  caption: { ...type.caption, fontFamily: fonts.regular },
});
