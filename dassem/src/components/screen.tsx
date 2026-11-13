import { router } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, layout, type } from '@/theme/tokens';

export function Screen({ children, scroll = true }: PropsWithChildren<{ scroll?: boolean }>) {
  const content = <View style={styles.content}>{children}</View>;
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      {scroll ? <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">{content}</ScrollView> : content}
    </SafeAreaView>
  );
}

export function TopBar({ title }: { title: string }) {
  return (
    <View style={styles.topBar}>
      <Pressable accessibilityLabel="뒤로 가기" onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>‹</Text>
      </Pressable>
      <Text style={type.headerTitle}>{title}</Text>
      <View style={styles.back} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, alignItems: 'center', paddingBottom: 28 },
  content: { width: '100%', maxWidth: Platform.OS === 'web' ? 375 : undefined, paddingHorizontal: layout.screenPaddingH },
  topBar: { height: layout.headerHeight, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: layout.minTouch, height: layout.minTouch, alignItems: 'center', justifyContent: 'center' },
  backText: { ...type.screenTitle, fontSize: 34, lineHeight: 38, color: colors.text },
});
