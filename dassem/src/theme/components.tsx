// 다씀 공통 UI 부품 (React Native StyleSheet + expo-image). 시안과 1:1로 맞춘 기준 구현입니다.
// 화면에서는 이 부품을 조합해 쓰고, 값이 필요하면 tokens.ts를 참조하세요.
import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { AppIcon } from '@/components/app-icon';
import type { ProductCategory } from '@/types/product';
import { colors, radius, shadow, type, statusTone } from './tokens';

const character = require('../../assets/dasseum/character.png');

type BtnProps = { label: string; onPress?: () => void; variant?: 'primary' | 'soft'; disabled?: boolean; style?: ViewStyle; icon?: React.ReactNode };
export function Button({ label, onPress, variant = 'primary', disabled, style, icon }: BtnProps) {
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.btn,
        { backgroundColor: disabled ? colors.primaryDisabled : primary ? (pressed ? colors.primaryPressed : colors.primary) : (pressed ? colors.subPressed : colors.sub) },
        style,
      ]}>
      {icon}
      <Text style={[type.button, { color: primary ? colors.onPrimary : colors.deep }]}>{label}</Text>
    </Pressable>
  );
}

// 홈의 큰 정사각형 버튼 2개 (물품 등록 / 구매 전 확인)
export function ActionTile({ title, sub, icon, onPress, variant }: { title: string; sub: string; icon: React.ReactNode; onPress?: () => void; variant: 'primary' | 'soft' }) {
  const primary = variant === 'primary';
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.tile, { backgroundColor: primary ? (pressed ? colors.primaryPressed : colors.primary) : (pressed ? colors.subPressed : colors.sub) }]}>
      {icon}
      <Text style={[type.tileTitle, { marginTop: 8, color: primary ? colors.onPrimary : colors.text }]}>{title}</Text>
      <Text style={[type.caption, { color: primary ? colors.onPrimary : colors.textSecondary }]}>{sub}</Text>
    </Pressable>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, { backgroundColor: active ? colors.primary : colors.surfaceMuted }]}>
      <Text style={[type.label, { fontFamily: 'Pretendard-Bold', color: active ? colors.onPrimary : colors.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

export function StatusTag({ text, isExpiry, daysLeft }: { text: string; isExpiry: boolean; daysLeft: number }) {
  const t = statusTone(isExpiry, daysLeft);
  return <View style={[s.tag, { backgroundColor: t.bg }]}><Text style={[type.tag, { color: t.fg }]}>{text}</Text></View>;
}

export function CategoryTag({ text }: { text: string }) {
  return <View style={[s.tag, { backgroundColor: colors.sub }]}><Text style={[type.tag, { color: colors.deep }]}>{text}</Text></View>;
}

// 'AI 물품 도우미', 'AI 인식 완료', '잠깐! 이미 있어요' 등 둥근 배지
export function Badge({ text, tone = 'ai' }: { text: string; tone?: 'ai' | 'soft' | 'danger' }) {
  const bg = tone === 'ai' ? colors.subStrong : tone === 'danger' ? colors.dangerBg : colors.sub;
  const fg = tone === 'danger' ? colors.danger : colors.deep;
  return <View style={[s.badge, { backgroundColor: bg }]}><Text style={[type.badge, { color: fg }]}>{text}</Text></View>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, shadow.card, style]}>{children}</View>;
}

// 연민트 배너 + 오른쪽 하단 캐릭터 (홈 / 구매 전 확인 / AI 확인 결과)
export function AiBanner({ children, characterWidth = 146, minHeight = 190, onPress }: { children: React.ReactNode; characterWidth?: number; minHeight?: number; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.banner, { minHeight }]}>
      <View style={{ maxWidth: 210, gap: 10, zIndex: 1 }}>{children}</View>
      <Image source={character} contentFit="contain" style={{ position: 'absolute', right: 6, bottom: 14, width: characterWidth, height: characterWidth * 0.8 }} />
    </Pressable>
  );
}

// 캐릭터 + 한 줄 안내 (스캔 중 / 인식 완료 / 사용 순서 추천)
export function AiNote({ eyebrow, text }: { eyebrow?: string; text: string }) {
  return (
    <View style={s.note}>
      <Image source={character} contentFit="contain" style={{ width: 44, height: 36 }} />
      <View style={{ flex: 1, gap: 2 }}>
        {eyebrow ? <Text style={[type.tag, { fontFamily: 'Pretendard-Bold', color: colors.deep }]}>{eyebrow}</Text> : null}
        <Text style={[type.itemName, { fontFamily: 'Pretendard-SemiBold' }]}>{text}</Text>
      </View>
    </View>
  );
}

// 켜짐/꺼짐 스위치 (설정). 켜짐 deep, 꺼짐 textDisabled
export function Toggle({ value, onValueChange, label }: { value: boolean; onValueChange: (next: boolean) => void; label: string }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      hitSlop={6}
      onPress={() => onValueChange(!value)}
      style={[s.toggle, { backgroundColor: value ? colors.deep : colors.textDisabled, justifyContent: value ? 'flex-end' : 'flex-start' }]}>
      <View style={s.knob} />
    </Pressable>
  );
}

// 2~3개 중 하나 고르기 (설정의 판단 기준 등)
export function Segmented<T extends string>({ options, value, onChange }: { options: readonly { id: T; label: string }[]; value: T; onChange: (id: T) => void }) {
  return (
    <View style={s.segmented}>
      {options.map((option) => {
        const active = option.id === value;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.id)}
            style={[s.segment, { backgroundColor: active ? colors.background : 'transparent' }]}>
            <Text style={[type.itemName, { color: active ? colors.deep : colors.textSecondary }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// 사진이 없으면 회색 빈칸 대신 카테고리 아이콘
const categoryIcons = {
  영양제: ['pills', 'nutrition-outline'],
  화장품: ['drop', 'water-outline'],
  의약품: ['cross.case', 'medkit-outline'],
  생활용품: ['basket', 'basket-outline'],
} as const;

export function Thumb({ uri, size = 56, category }: { uri?: string; size?: number; category?: ProductCategory }) {
  const box = { width: size, height: size, borderRadius: radius.thumb };
  if (uri) return <Image source={{ uri }} contentFit="cover" style={[box, { backgroundColor: colors.imageBg }]} />;
  const icon = category ? categoryIcons[category] : null;
  return (
    <View accessibilityLabel={category ? `${category} 사진 없음` : '사진 없음'} style={[box, { backgroundColor: icon ? colors.sub : colors.imageBg, alignItems: 'center', justifyContent: 'center' }]}>
      {icon ? <AppIcon symbol={icon[0]} fallback={icon[1]} size={Math.round(size * 0.46)} color={colors.deep} /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  btn: { height: 56, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  tile: { flex: 1, height: 126, borderRadius: radius.card, alignItems: 'center', justifyContent: 'center', gap: 4 },
  chip: { height: 38, paddingHorizontal: 16, borderRadius: radius.chip, alignItems: 'center', justifyContent: 'center' },
  tag: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.tag },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 11, paddingVertical: 5, borderRadius: radius.badge },
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: 14, backgroundColor: colors.background },
  banner: { backgroundColor: colors.sub, borderRadius: radius.banner, paddingHorizontal: 18, paddingTop: 20, paddingBottom: 22, overflow: 'hidden' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.sub, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  toggle: { width: 52, height: 32, borderRadius: 16, padding: 3, flexDirection: 'row' },
  knob: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.background, ...shadow.card },
  segmented: { flexDirection: 'row', backgroundColor: colors.sub, borderRadius: 16, padding: 4 },
  segment: { flex: 1, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
