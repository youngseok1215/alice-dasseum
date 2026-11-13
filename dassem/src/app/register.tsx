import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { createProduct } from '@/api/products';
import { AppIcon } from '@/components/app-icon';
import { Screen, TopBar } from '@/components/screen';
import { addProduct } from '@/data/app-store';
import { PRODUCT_CATEGORIES, type ProductCategory } from '@/types/product';
import { Button, Chip } from '@/theme/components';
import { colors, radius, spacing, type } from '@/theme/tokens';

type Form = { name: string; category: ProductCategory | ''; openedAt: string; expiresAt: string };
const empty: Form = { name: '', category: '', openedAt: '', expiresAt: '' };
const helpSteps = ['사진에서 제품명과 카테고리를 찾아요', '유통기한이 보이면 함께 읽어요'];

export default function RegisterScreen() {
  const { name, category, expiresAt } =
    useLocalSearchParams<{ name?: string; category?: string; expiresAt?: string }>();
  const [tab, setTab] = useState<'photo' | 'manual'>(name ? 'manual' : 'photo');
  const [form, setForm] = useState<Form>(() => ({
    ...empty,
    name: name ?? '',
    category: PRODUCT_CATEGORIES.find((value) => value === category) ?? '',
    expiresAt: expiresAt ?? '',
  }));

  const photo = tab === 'photo';
  const [saving, setSaving] = useState(false);
  const canSubmit = Boolean(form.name.trim() && form.category) && !saving;
  const submit = async () => {
    if (!canSubmit || !form.category) return;
    setSaving(true);
    try {
      const product = await createProduct({
        name: form.name.trim(),
        category: form.category,
        quantity: 1,
        openedAt: form.openedAt || undefined,
        expiresAt: form.expiresAt || undefined,
      });
      addProduct(product);
      router.replace('/(tabs)/items');
    } catch (error) {
      Alert.alert(
        '등록하지 못했어요',
        error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.',
      );
    } finally {
      setSaving(false);
    }
  };

  return <Screen>
    <TopBar title="물품 등록" />
    <View style={styles.segment}>
      {(['photo', 'manual'] as const).map((id) => (
        <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: tab === id }} onPress={() => setTab(id)} style={[styles.segmentItem, tab === id && styles.segmentActive]}>
          <Text style={[type.itemName, tab === id ? styles.activeText : styles.inactiveText]}>{id === 'photo' ? 'AI 사진 인식' : '직접 입력'}</Text>
        </Pressable>
      ))}
    </View>

    <View style={styles.body}>
      {photo && <>
        <View style={styles.cameraArea}>
          <View style={styles.focusFrame}>
            <AppIcon symbol="camera" fallback="camera-outline" size={40} color={colors.deep} />
            <Text style={[type.bodySm, styles.muted]}>제품 이름이 잘 보이게 찍어주세요</Text>
          </View>
        </View>
        <Button label="촬영하고 AI로 인식하기" onPress={() => router.push({ pathname: '/check/camera', params: { purpose: 'register' } })} icon={<AppIcon symbol="camera" fallback="camera-outline" size={20} color={colors.onPrimary} />} />
        <View style={styles.help}>
          <Text style={type.itemName}>AI가 이렇게 도와줘요</Text>
          {helpSteps.map((step, i) => <Text key={step} style={[type.bodySm, styles.muted]}>{i + 1}. {step}</Text>)}
        </View>
      </>}

      {!photo && <>
        <View style={styles.form}>
          <View style={styles.row}><Text style={[type.label, styles.label]}>제품명</Text><TextInput accessibilityLabel="제품명" value={form.name} onChangeText={(name) => setForm((prev) => ({ ...prev, name }))} placeholder="예: 비타민D 2000IU" placeholderTextColor={colors.textDisabled} style={styles.input} /></View>
          <View style={[styles.categoryRow, styles.divider]}>
            <Text style={[type.label, styles.label]}>카테고리</Text>
            <View style={styles.chips}>{PRODUCT_CATEGORIES.map((category) => <Chip key={category} label={category} active={form.category === category} onPress={() => setForm((prev) => ({ ...prev, category }))} />)}</View>
          </View>
          {([['개봉일', 'openedAt'], ['유통기한', 'expiresAt']] as const).map(([label, key]) => (
            <View key={key} style={[styles.row, styles.divider]}><Text style={[type.label, styles.label]}>{label}</Text><TextInput accessibilityLabel={label} value={form[key]} onChangeText={(value) => setForm((prev) => ({ ...prev, [key]: value }))} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textDisabled} style={styles.input} /></View>
          ))}
        </View>
        {!canSubmit && <Text style={styles.hint}>제품명을 입력하면 등록할 수 있어요</Text>}
        <Button label="AI로 보유 제품 확인 후 등록" onPress={submit} disabled={!canSubmit} />
      </>}
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  segment: { height: 50, padding: 4, borderRadius: 16, backgroundColor: colors.sub, flexDirection: 'row', marginBottom: spacing['2xl'] },
  segmentItem: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  segmentActive: { backgroundColor: colors.background },
  activeText: { color: colors.deep }, inactiveText: { color: colors.textSecondary },
  body: { gap: spacing['2xl'] },
  cameraArea: { height: 230, borderRadius: radius.banner, backgroundColor: colors.sub, padding: 22 },
  focusFrame: { flex: 1, borderWidth: 3, borderColor: colors.primary, borderRadius: radius.card, alignItems: 'center', justifyContent: 'center', gap: spacing.md, overflow: 'hidden', paddingHorizontal: spacing.xl },
  muted: { color: colors.textSecondary },
  help: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: spacing['3xl'], gap: spacing.md },
  form: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, paddingHorizontal: 14 },
  row: { minHeight: 58, flexDirection: 'row', alignItems: 'center' },
  categoryRow: { paddingVertical: spacing.xl, gap: spacing.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  divider: { borderTopWidth: 1, borderTopColor: colors.divider },
  label: { width: 72, color: colors.textSecondary },
  input: { ...type.body, flex: 1, paddingVertical: 10, color: colors.text },
  hint: { ...type.caption, color: colors.textTertiary, textAlign: 'center' },
});
