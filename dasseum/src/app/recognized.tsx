// + 제품 등록 · AI 인식 완료 (목업: 비타민D 정보 자동 입력)
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';
import { clearPendingRegistration, createProduct, getPendingPhoto, getPendingSuggestion, saveProductImage } from '@/api/products';
import { DateField } from '@/components/DateField';
import { nav, Screen, Scroll } from '@/components/shell';
import { ActionArea, DBadge, DButton, Hair, Icon, T, TopBar } from '@/components/ui';
import { CATEGORIES } from '@/data/products';
import { useApp } from '@/store/AppStore';
import { C, FONT, tx } from '@/theme/tokens';

function Label({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 6 }}>
      <T style={tx(14, 20, 600, C.neutral)}>{children}</T>
      {hint ? <T style={[tx(12, 16, 400, C.alt), { marginBottom: 2 }]}>{hint}</T> : null}
    </View>
  );
}

export default function Recognized() {
  const suggestion = getPendingSuggestion();
  const [f, setF] = useState({
    name: suggestion?.name || '',
    cat: suggestion?.category || '',
    opened: '',
    expires: suggestion?.expiresAt || '',
  });
  const [focus, setFocus] = useState(false);
  const [saving, setSaving] = useState(false);
  const { addProduct } = useApp();
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));
  const ok = !!(f.name.trim() && f.cat);
  const submit = async () => {
    if (!ok || saving) return;
    setSaving(true);
    try {
      const photo = getPendingPhoto();
      const imageUri = photo ? await saveProductImage(photo) : undefined;
      const product = await createProduct({
        name: f.name.trim(),
        brand: suggestion?.brand || undefined,
        category: f.cat as (typeof CATEGORIES)[number],
        openedAt: f.opened || undefined,
        expiresAt: f.expires || undefined,
        imageUri,
      });
      addProduct(product);
      clearPendingRegistration();
      router.replace('/registered');
    } catch (error) {
      Alert.alert('제품을 등록하지 못했어요', error instanceof Error ? error.message : '다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <TopBar title="AI 인식 완료" onBack={nav.back} />
      <Scroll style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 4, paddingHorizontal: 20, paddingBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: C.fillAlt, marginBottom: 20 }}>
          <Icon name="camera" size={18} color={C.alt} />
          <T style={tx(14, 20, 400, C.neutral)}>촬영한 사진에서 정보를 찾았어요</T>
        </View>
        <View style={{ flexDirection: 'row' }}><DBadge tone="mint">인식 완료</DBadge></View>
        <T style={[tx(24, 32, 700), { marginTop: 10 }]}>{suggestion?.name ? `${suggestion.name} 정보를 찾았어요` : '인식한 정보를 확인해 주세요'}</T>
        <T style={[tx(15, 22, 400, C.alt), { marginTop: 4 }]}>AI가 잘못 읽었을 수 있어요. 확인하고 다르면 고쳐 주세요.</T>

        <View style={{ gap: 18, marginTop: 24 }}>
          <View>
            <Label>제품명</Label>
            <View style={{ height: 48, borderRadius: 12, backgroundColor: C.white, justifyContent: 'center' }}>
              <Hair radius={12} color={focus ? C.point : C.lineNeutral} width={focus ? 2 : 1} />
              <TextInput value={f.name} onChangeText={(v) => set('name', v)} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
                placeholder="제품명을 입력하세요" placeholderTextColor={C.alt} allowFontScaling={false}
                style={{ height: 48, paddingHorizontal: 14, paddingVertical: 0, fontSize: 16, fontFamily: FONT[500], letterSpacing: 0.096, color: C.ink }} />
            </View>
          </View>
          <View>
            <Label>카테고리</Label>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {CATEGORIES.map((c) => {
                const on = f.cat === c;
                return (
                  <Pressable key={c} onPress={() => set('cat', c)} accessibilityRole="button" accessibilityState={{ selected: on }}
                    style={{ height: 36, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center', backgroundColor: on ? C.mint : C.white }}>
                    {!on && <Hair radius={999} color={C.lineNeutral} />}
                    <T style={tx(14, 20, on ? 700 : 600, on ? C.ink : C.neutral)}>{c}</T>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View>
            <Label hint="비워 두면 미개봉으로 저장돼요">개봉일</Label>
            <DateField value={f.opened} onChange={(v) => set('opened', v)} />
          </View>
          <View>
            <Label>유통기한</Label>
            <DateField value={f.expires} onChange={(v) => set('expires', v)} />
          </View>
        </View>
      </Scroll>
      <ActionArea><DButton label={saving ? '저장 중...' : '등록 완료'} disabled={!ok || saving} onPress={submit} /></ActionArea>
    </Screen>
  );
}
