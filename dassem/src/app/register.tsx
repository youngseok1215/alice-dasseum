import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { Screen, TopBar } from '@/components/screen';
import { AiNote, Button } from '@/theme/components';
import { colors, motion, radius, spacing, type } from '@/theme/tokens';

type Scan = 'idle' | 'scanning' | 'done';
type Form = { name: string; category: string; openedAt: string; expiresAt: string };
const empty: Form = { name: '', category: '', openedAt: '', expiresAt: '' };

export default function RegisterScreen() {
  const [tab, setTab] = useState<'photo' | 'manual'>('photo');
  const [scan, setScan] = useState<Scan>('idle');
  const [form, setForm] = useState<Form>(empty);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (scan !== 'scanning') return;
    const timer = setTimeout(() => { setScan('done'); setForm({ name: '비타민D 2000IU', category: '영양제', openedAt: '2026-11-11', expiresAt: '2027-11-11' }); }, motion.scanDuration);
    return () => clearTimeout(timer);
  }, [scan]);

  const submit = () => {
    setSubmitted(true);
    if (!form.name.trim()) return;
    router.push({ pathname: '/result', params: { from: 'register', q: form.name } });
  };

  return <Screen>
    <TopBar title="물품 등록" />
    <View style={styles.segment}>
      <Pressable onPress={() => setTab('photo')} style={[styles.segmentItem, tab === 'photo' && styles.segmentActive]}><Text style={[type.itemName, tab === 'photo' && styles.activeText]}>AI 사진 인식</Text></Pressable>
      <Pressable onPress={() => setTab('manual')} style={[styles.segmentItem, tab === 'manual' && styles.segmentActive]}><Text style={[type.itemName, tab === 'manual' && styles.activeText]}>직접 입력</Text></Pressable>
    </View>
    <View style={styles.body}>
      {tab === 'photo' && <>
        <View style={styles.cameraArea}>
          <View style={styles.focusFrame}><AppIcon symbol={scan === 'done' ? 'checkmark.circle.fill' : 'camera.fill'} fallback={scan === 'done' ? 'checkmark-circle' : 'camera'} size={48} color={colors.primary} />{scan === 'scanning' && <View style={styles.scanLine} />}</View>
          {scan === 'idle' && <Button label="촬영하고 AI로 인식하기" onPress={() => setScan('scanning')} style={styles.capture} />}
        </View>
        {scan === 'scanning' && <AiNote text="AI가 제품을 살펴보고 있어요…" />}
        {scan === 'done' && <AiNote eyebrow="AI 인식 완료" text="제품 정보를 채워뒀어요. 확인해 주세요!" />}
      </>}
      <View style={styles.form}>{([
        ['제품명', 'name', '제품명을 입력하세요'], ['카테고리', 'category', '영양제 · 화장품 · 의약품 · 생활용품'], ['개봉일', 'openedAt', 'YYYY-MM-DD'], ['유통기한', 'expiresAt', 'YYYY-MM-DD'],
      ] as const).map(([label, key, placeholder], index) => <View key={key} style={[styles.row, index > 0 && styles.divider]}><Text style={[type.label, styles.label]}>{label}</Text><TextInput value={form[key]} onChangeText={(value) => setForm((prev) => ({ ...prev, [key]: value }))} placeholder={placeholder} placeholderTextColor={colors.textDisabled} style={styles.input} /></View>)}
        {submitted && !form.name.trim() && <Text style={styles.error}>제품명을 입력해 주세요</Text>}
      </View>
      <Button label="AI로 보유 제품 확인 후 등록" onPress={submit} />
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  segment: { height: 50, padding: 4, borderRadius: 16, backgroundColor: colors.sub, flexDirection: 'row', marginBottom: 14 },
  segmentItem: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 13 }, segmentActive: { backgroundColor: colors.background }, activeText: { color: colors.deep },
  body: { gap: spacing['2xl'] }, cameraArea: { height: 230, borderRadius: radius.banner, backgroundColor: colors.sub, padding: 22, alignItems: 'center', justifyContent: 'center' },
  focusFrame: { width: '100%', height: '100%', borderWidth: 3, borderColor: colors.primary, borderRadius: radius.card, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  scanLine: { position: 'absolute', left: 10, right: 10, top: '48%', height: 3, backgroundColor: colors.primary }, capture: { position: 'absolute', left: 34, right: 34, bottom: 18 },
  form: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, paddingHorizontal: 14 },
  row: { minHeight: 58, flexDirection: 'row', alignItems: 'center' }, divider: { borderTopWidth: 1, borderTopColor: colors.divider }, label: { width: 72, color: colors.textSecondary }, input: { ...type.body, flex: 1, paddingVertical: 10, color: colors.text },
  error: { ...type.caption, color: colors.danger, paddingBottom: 12, paddingLeft: 72 },
});
