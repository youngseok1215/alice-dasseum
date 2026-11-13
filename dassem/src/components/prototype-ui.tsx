import { router } from 'expo-router';
import type { PropsWithChildren, ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import type { Product } from '@/types/product';
import { colors, fonts, radius, spacing, type } from '@/theme/tokens';

export const mascots = {
  smile: require('../../assets/dasseum/v2/mascot-smile-transparent.png'),
  search: require('../../assets/dasseum/v2/mascot-search-transparent.png'),
  hold: require('../../assets/dasseum/v2/mascot-hold-transparent.png'),
  done: require('../../assets/dasseum/v2/mascot-done-transparent.png'),
};

export function Mascot({ kind, size = 120 }: { kind: keyof typeof mascots; size?: number }) {
  return <Image source={mascots[kind]} resizeMode="contain" style={{ width: size, height: size }} />;
}

export function Header({ title, right, back = false }: { title?: string; right?: ReactNode; back?: boolean }) {
  return <View style={styles.header}>
    <View style={styles.headerSide}>{back && <Pressable onPress={() => router.back()} style={styles.touch}><AppIcon symbol="chevron.left" fallback="chevron-back" size={25} color={colors.text} /></Pressable>}</View>
    {title ? <Text style={type.headerTitle}>{title}</Text> : <Text style={styles.logo}>다씀</Text>}
    <View style={[styles.headerSide, styles.right]}>{right}</View>
  </View>;
}

export function PrimaryButton({ label, onPress, variant = 'solid', icon, disabled }: { label: string; onPress: () => void; variant?: 'solid' | 'outline' | 'cream'; icon?: ReactNode; disabled?: boolean }) {
  return <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, variant === 'outline' && styles.outline, variant === 'cream' && styles.cream, disabled && styles.disabled, pressed && { opacity: .8 }]}>
    {icon}<Text style={styles.buttonText}>{label}</Text>
  </Pressable>;
}

export function SectionTitle({ children, action, onAction }: PropsWithChildren<{ action?: string; onAction?: () => void }>) {
  return <View style={styles.sectionTitle}><Text style={type.sectionTitle}>{children}</Text>{action && <Pressable onPress={onAction}><Text style={styles.action}>{action}</Text></Pressable>}</View>;
}

export function ProductRow({ product, rank, onPress }: { product: Product; rank?: number; onPress?: () => void }) {
  const dday = product.dday;
  return <Pressable onPress={onPress} style={styles.product}>
    <View style={styles.thumb}>{rank ? <Text style={styles.rank}>{rank}</Text> : <Text style={styles.thumbText}>{product.name.charAt(0)}</Text>}</View>
    <View style={styles.productCopy}><Text numberOfLines={1} style={type.itemName}>{product.name}</Text><Text style={styles.meta}>{product.brand} · {product.openedAt ? '사용 중' : '미개봉'}</Text></View>
    {typeof dday === 'number' && <View style={[styles.dday, dday <= 7 && styles.urgent]}><Text style={[styles.ddayText, dday <= 7 && styles.urgentText]}>{dday < 0 ? `D+${Math.abs(dday)}` : `D-${dday}`}</Text></View>}
    <AppIcon symbol="chevron.right" fallback="chevron-forward" size={16} color={colors.textDisabled} />
  </Pressable>;
}

export function SoftCard({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) { return <View style={[styles.card, style]}>{children}</View>; }

const styles = StyleSheet.create({
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSide: { width: 52 }, right: { alignItems: 'flex-end' }, touch: { width: 44, height: 44, justifyContent: 'center' },
  logo: { ...type.logo, fontSize: 22, color: colors.deep },
  button: { minHeight: 54, borderRadius: radius.button, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 18 },
  outline: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.deep }, cream: { backgroundColor: colors.cream }, disabled: { opacity: .4 },
  buttonText: { ...type.button, color: colors.text },
  sectionTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, action: { ...type.label, color: colors.deep, fontFamily: fonts.bold },
  product: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.surface, borderRadius: radius.card, padding: 12, borderWidth: 1, borderColor: colors.divider },
  thumb: { width: 50, height: 50, borderRadius: 16, backgroundColor: colors.sub, alignItems: 'center', justifyContent: 'center' }, thumbText: { ...type.cardTitle, color: colors.deep }, rank: { ...type.cardTitle, color: colors.deep },
  productCopy: { flex: 1, gap: 4 }, meta: { ...type.caption, color: colors.textTertiary }, dday: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.cream }, ddayText: { ...type.tag, color: colors.caution }, urgent: { backgroundColor: colors.dangerBg }, urgentText: { color: colors.danger },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing['3xl'], borderWidth: 1, borderColor: colors.divider },
});
