import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';
import { DateField } from '@/components/DateField';
import { nav, Screen, Scroll } from '@/components/shell';
import { ActionArea, DButton, Hair, T, TopBar } from '@/components/ui';
import { CATEGORIES, type Product } from '@/data/products';
import { useApp } from '@/store/AppStore';
import { C, FONT, tx } from '@/theme/tokens';

function Label({ children }: { children: ReactNode }) {
  return <T style={[tx(14, 20, 600, C.neutral), { marginBottom: 6 }]}>{children}</T>;
}

function TextField({ value, onChangeText, placeholder }: { value: string; onChangeText: (value: string) => void; placeholder: string }) {
  return (
    <View style={{ height: 48, borderRadius: 12, backgroundColor: C.white, justifyContent: 'center' }}>
      <Hair radius={12} color={C.lineNeutral} />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={C.alt}
        allowFontScaling={false} style={{ height: 48, paddingHorizontal: 14, paddingVertical: 0, fontSize: 16,
          fontFamily: FONT[500], letterSpacing: 0.096, color: C.ink }} />
    </View>
  );
}

export default function EditProduct() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { product, updateOwnedProduct, deleteOwnedProduct } = useApp();
  const original = product(id ?? 'vitd');
  const [form, setForm] = useState({
    name: original.name,
    brand: original.brand,
    cat: original.cat,
    opened: original.opened?.replace(/\./g, '-') ?? '',
    expires: original.expires?.replace(/\./g, '-') ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const valid = !!form.name.trim() && !!form.cat;

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const next: Product = {
        ...original,
        name: form.name.trim(),
        brand: form.brand.trim(),
        cat: form.cat as Product['cat'],
        opened: form.opened ? form.opened.replace(/-/g, '.') : null,
        expires: form.expires ? form.expires.replace(/-/g, '.') : null,
      };
      await updateOwnedProduct(next);
      router.replace({ pathname: '/product/[id]', params: { id: original.id } });
    } catch (error) {
      Alert.alert('제품을 수정하지 못했어요', error instanceof Error ? error.message : '다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteOwnedProduct(original.id);
      nav.reset('/items');
    } catch (error) {
      Alert.alert('제품을 삭제하지 못했어요', error instanceof Error ? error.message : '다시 시도해 주세요.');
      setDeleting(false);
    }
  };

  return (
    <Screen>
      <TopBar title="제품 수정" onBack={nav.back} />
      <Scroll style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}>
        <View style={{ gap: 18 }}>
          <View><Label>제품명</Label><TextField value={form.name} onChangeText={(value) => set('name', value)} placeholder="제품명을 입력하세요" /></View>
          <View><Label>브랜드</Label><TextField value={form.brand} onChangeText={(value) => set('brand', value)} placeholder="브랜드를 입력하세요" /></View>
          <View>
            <Label>카테고리</Label>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {CATEGORIES.map((category) => {
                const selected = form.cat === category;
                return (
                  <Pressable key={category} onPress={() => set('cat', category)} accessibilityRole="button" accessibilityState={{ selected }}
                    style={{ height: 36, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center', backgroundColor: selected ? C.mint : C.white }}>
                    {!selected && <Hair radius={999} color={C.lineNeutral} />}
                    <T style={tx(14, 20, selected ? 700 : 600, selected ? C.ink : C.neutral)}>{category}</T>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View><Label>개봉일</Label><DateField value={form.opened} onChange={(value) => set('opened', value)} /></View>
          <View><Label>사용기한</Label><DateField value={form.expires} onChange={(value) => set('expires', value)} /></View>
          {confirmingDelete ? (
            <View style={{ padding: 16, gap: 12, borderRadius: 12, backgroundColor: C.white }}>
              <Hair radius={12} color={C.lineNeutral} />
              <View>
                <T style={tx(16, 24, 700)}>이 제품을 삭제할까요?</T>
                <T style={[tx(14, 20, 400, C.alt), { marginTop: 3 }]}>삭제하면 내 물품과 추천 목록에서 사라져요.</T>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}><DButton label="취소" variant="outlined" size="md" onPress={() => setConfirmingDelete(false)} /></View>
                <View style={{ flex: 1 }}><DButton label={deleting ? '삭제 중...' : '삭제하기'} size="md" disabled={deleting} onPress={remove} /></View>
              </View>
            </View>
          ) : (
            <Pressable onPress={() => setConfirmingDelete(true)} accessibilityRole="button" accessibilityLabel="제품 삭제"
              style={{ alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 16 }}>
              <T style={tx(14, 20, 600, C.negative)}>제품 삭제</T>
            </Pressable>
          )}
        </View>
      </Scroll>
      <ActionArea><DButton label={saving ? '저장 중...' : '수정 완료'} disabled={!valid || saving} onPress={save} /></ActionArea>
    </Screen>
  );
}
