// 설정 화면용 목록 부품: 섹션 카드 + 스위치 행 / 이동 행 / 정보 행
import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { Toggle } from '@/theme/components';
import { colors, radius, spacing, type } from '@/theme/tokens';

export function SettingsSection({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

export function ToggleRow({ title, desc, value, onValueChange, last }: { title: string; desc?: string; value: boolean; onValueChange: (next: boolean) => void; last?: boolean }) {
  return (
    <View style={[styles.row, styles.rowTall, !last && styles.divider]}>
      <View style={styles.copy}>
        <Text style={type.body}>{title}</Text>
        {desc ? <Text style={styles.desc}>{desc}</Text> : null}
      </View>
      <Toggle label={title} value={value} onValueChange={onValueChange} />
    </View>
  );
}

export function LinkRow({ title, value, onPress, last }: { title: string; value?: string; onPress?: () => void; last?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, !last && styles.divider, pressed && styles.pressed]}>
      <Text style={[type.body, styles.copy]}>{title}</Text>
      {value ? <Text style={styles.value}>{value}</Text> : null}
      <AppIcon symbol="chevron.right" fallback="chevron-forward" size={16} color={colors.textDisabled} />
    </Pressable>
  );
}

export function InfoRow({ title, value, last }: { title: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.divider]}>
      <Text style={[type.body, styles.copy]}>{title}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  sectionTitle: { ...type.label, fontFamily: 'Pretendard-Bold', color: colors.textSecondary, paddingHorizontal: spacing.xs },
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, paddingHorizontal: spacing['3xl'], paddingVertical: spacing.xs, backgroundColor: colors.background },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  rowTall: { minHeight: 64, paddingVertical: spacing.md },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  pressed: { opacity: 0.6 },
  copy: { flex: 1, gap: spacing.xxs },
  desc: { ...type.caption, color: colors.textTertiary },
  value: { ...type.label, color: colors.textTertiary },
});
