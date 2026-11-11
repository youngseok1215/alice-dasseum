import { StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { useToast } from '@/data/toast-store';
import { colors, layout, shadow, spacing, type } from '@/theme/tokens';

export function Toast() {
  const toast = useToast();
  if (!toast) return null;
  return (
    <View pointerEvents="none" accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.toast, shadow.toast]}>
      <AppIcon symbol="checkmark.circle.fill" fallback="checkmark-circle" size={22} color={colors.primary} />
      <View style={styles.copy}>
        <Text style={[type.itemName, styles.title]}>{toast.title}</Text>
        {toast.sub ? <Text style={[type.caption, styles.sub]}>{toast.sub}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute', left: layout.screenPaddingH, right: layout.screenPaddingH, bottom: layout.tabBarHeight + spacing['3xl'],
    backgroundColor: colors.toastBg, borderRadius: 16, paddingHorizontal: spacing['3xl'], paddingVertical: spacing['2xl'],
    flexDirection: 'row', alignItems: 'center', gap: spacing.lg,
  },
  copy: { flex: 1, gap: spacing.xxs },
  title: { color: colors.onPrimary },
  sub: { color: colors.subStrong },
});
