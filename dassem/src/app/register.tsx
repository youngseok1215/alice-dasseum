import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { Screen, TopBar } from '@/components/screen';
import { PRODUCT_CATEGORIES, type ProductCategory } from '@/types/product';
import { AiNote, Button, Chip } from '@/theme/components';
import { colors, motion, radius, spacing, type } from '@/theme/tokens';

type Scan = 'idle' | 'scanning' | 'done';
type Form = { name: string; category: ProductCategory | ''; openedAt: string; expiresAt: string };
const empty: Form = { name: '', category: '', openedAt: '', expiresAt: '' };
// TODO(백엔드): POST /api/ai/recognize 응답으로 교체
const recognized: Form = { name: '비타민D 2000IU', category: '영양제', openedAt: '2026-11-11', expiresAt: '2027-11-11' };

const helpSteps = ['사진에서 제품명과 카테고리를 찾아요', '유통기한이 보이면 함께 읽어요', '이미 가진 물품과 비교해 알려줘요'];

export default function RegisterScreen() {
  const [tab, setTab] = useState<'photo' | 'manual'>('photo');
  const [scan, setScan] = useState<Scan>('idle');
  const [form, setForm] = useState<Form>(empty);

  useEffect(() => {
    if (scan !== 'scanning') return;
    const timer = setTimeout(() => { setScan('done'); setForm(recognized); }, motion.scanDuration);
    return () => clearTimeout(timer);
  }, [scan]);

  const photo = tab === 'photo';
  const showForm = !photo || scan === 'done';
  const canSubmit = Boolean(form.name.trim());
  const retake = () => { setScan('idle'); setForm(empty); };
  const submit = () => { if (canSubmit) router.push({ pathname: '/result', params: { from: 'register', q: form.name.trim() } }); };

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
        {/* 촬영 버튼은 틀 아래로 — 틀과 겹치지 않게 */}
        <View style={[styles.cameraArea, scan === 'done' && styles.cameraDone]}>
          <View style={styles.focusFrame}>
            {scan === 'idle' && <><AppIcon symbol="camera" fallback="camera-outline" size={40} color={colors.deep} /><Text style={[type.bodySm, styles.muted]}>제품 앞면이 틀 안에 들어오게 찍어주세요</Text></>}
            {scan === 'scanning' && <View style={styles.scanLine} />}
            {scan === 'done' && <AppIcon symbol="checkmark.circle.fill" fallback="checkmark-circle" size={44} color={colors.primary} />}
          </View>
        </View>
        {scan === 'idle' && <>
          <Button label="촬영하고 AI로 인식하기" onPress={() => setScan('scanning')} icon={<AppIcon symbol="camera" fallback="camera-outline" size={20} color={colors.onPrimary} />} />
          <View style={styles.help}>
            <Text style={type.itemName}>AI가 이렇게 도와줘요</Text>
            {helpSteps.map((step, i) => <Text key={step} style={[type.bodySm, styles.muted]}>{i + 1}. {step}</Text>)}
          </View>
        </>}
        {scan === 'scanning' && <AiNote text="AI가 제품을 살펴보고 있어요…" />}
        {scan === 'done' && <View style={styles.doneRow}>
          <View style={styles.flex}><AiNote eyebrow="AI 인식 완료" text="제품 정보를 채워뒀어요. 확인해 주세요!" /></View>
          <Pressable accessibilityRole="button" onPress={retake} style={styles.retake}><Text style={[type.itemName, styles.activeText]}>다시 찍기</Text></Pressable>
        </View>}
      </>}

      {showForm && <>
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
  cameraDone: { height: 150 },
  focusFrame: { flex: 1, borderWidth: 3, borderColor: colors.primary, borderRadius: radius.card, alignItems: 'center', justifyContent: 'center', gap: spacing.md, overflow: 'hidden', paddingHorizontal: spacing.xl },
  scanLine: { position: 'absolute', left: 10, right: 10, top: '48%', height: 3, backgroundColor: colors.primary },
  muted: { color: colors.textSecondary },
  help: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: spacing['3xl'], gap: spacing.md },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs }, flex: { flex: 1 },
  retake: { minHeight: 44, paddingHorizontal: spacing.md, justifyContent: 'center' },
  form: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, paddingHorizontal: 14 },
  row: { minHeight: 58, flexDirection: 'row', alignItems: 'center' },
  categoryRow: { paddingVertical: spacing.xl, gap: spacing.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  divider: { borderTopWidth: 1, borderTopColor: colors.divider },
  label: { width: 72, color: colors.textSecondary },
  input: { ...type.body, flex: 1, paddingVertical: 10, color: colors.text },
  hint: { ...type.caption, color: colors.textTertiary, textAlign: 'center' },
});
