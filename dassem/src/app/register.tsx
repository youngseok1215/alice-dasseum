import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { saveProductImage, searchProductImages, type ProductImageSuggestion } from '@/api/product-images';
import { clearRecognitionPhoto, getRecognitionPhoto } from '@/api/product-vision';
import { createProduct } from '@/api/products';
import { AppIcon } from '@/components/app-icon';
import { Screen, TopBar } from '@/components/screen';
import { addProduct } from '@/data/app-store';
import { PRODUCT_CATEGORIES, type ProductCategory } from '@/types/product';
import { Button, Chip } from '@/theme/components';
import { colors, radius, spacing, type } from '@/theme/tokens';

type Form = { name: string; brand: string; category: ProductCategory | ''; openedAt: string; expiresAt: string };
type ImageChoice =
  | { kind: 'captured'; dataUri: string }
  | { kind: 'remote'; url: string; preview: string };

const empty: Form = { name: '', brand: '', category: '', openedAt: '', expiresAt: '' };
const helpSteps = ['사진에서 제품명과 카테고리를 찾아요', '유통기한이 보이면 함께 읽어요'];

export default function RegisterScreen() {
  const { name, brand, category, expiresAt, fromPhoto } =
    useLocalSearchParams<{ name?: string; brand?: string; category?: string; expiresAt?: string; fromPhoto?: string }>();
  const recognizedPhoto = fromPhoto === '1' ? getRecognitionPhoto() : undefined;
  const [tab, setTab] = useState<'photo' | 'manual'>(name ? 'manual' : 'photo');
  const [form, setForm] = useState<Form>(() => ({
    ...empty,
    name: name ?? '',
    brand: brand ?? '',
    category: PRODUCT_CATEGORIES.find((value) => value === category) ?? '',
    expiresAt: expiresAt ?? '',
  }));
  const [suggestions, setSuggestions] = useState<ProductImageSuggestion[]>([]);
  const [searchingImages, setSearchingImages] = useState(false);
  const [imageSearchConfigured, setImageSearchConfigured] = useState(true);
  const [imageChoice, setImageChoice] = useState<ImageChoice | undefined>(() =>
    recognizedPhoto ? { kind: 'captured', dataUri: recognizedPhoto } : undefined,
  );
  const [imageSearchSource, setImageSearchSource] = useState(recognizedPhoto);
  const userPickedImage = useRef(false);
  const [saving, setSaving] = useState(false);

  const photo = tab === 'photo';
  const canSubmit = Boolean(form.name.trim() && form.category) && !saving;
  const previewUri = imageChoice?.kind === 'captured' ? imageChoice.dataUri : imageChoice?.preview;

  useEffect(() => {
    if (!imageSearchSource) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSearchingImages(true);
      searchProductImages(imageSearchSource, controller.signal).then((result) => {
        setImageSearchConfigured(result.configured);
        setSuggestions(result.images);
        if (result.images[0] && !userPickedImage.current) {
          setImageChoice({ kind: 'remote', url: result.images[0].url, preview: result.images[0].thumbnail });
        }
      }).catch(() => {
        if (!controller.signal.aborted) setSuggestions([]);
      }).finally(() => {
        if (!controller.signal.aborted) setSearchingImages(false);
      });
    }, 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [imageSearchSource]);

  const chooseSuggestion = (suggestion: ProductImageSuggestion) => {
    userPickedImage.current = true;
    setImageChoice({ kind: 'remote', url: suggestion.url, preview: suggestion.thumbnail });
  };

  const pickOwnPhoto = async (camera: boolean) => {
    try {
      if (camera && Platform.OS !== 'web') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('카메라 권한이 필요해요', '권한을 허용하거나 앨범에서 사진을 선택해 주세요.');
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        quality: 0.7,
        base64: true,
        allowsEditing: true,
        aspect: [1, 1],
      };
      const result = await (camera && Platform.OS !== 'web'
        ? ImagePicker.launchCameraAsync(options)
        : ImagePicker.launchImageLibraryAsync(options));
      if (result.canceled) return;
      const base64 = result.assets[0]?.base64;
      if (!base64) {
        Alert.alert('사진을 읽지 못했어요', '다른 사진으로 다시 시도해 주세요.');
        return;
      }
      userPickedImage.current = true;
      const dataUri = `data:image/jpeg;base64,${base64}`;
      setImageChoice({ kind: 'captured', dataUri });
      setImageSearchSource(dataUri);
    } catch {
      Alert.alert('사진을 열지 못했어요', '다시 시도해 주세요.');
    }
  };

  const submit = async () => {
    if (!canSubmit || !form.category) return;
    setSaving(true);
    try {
      const imageUri = imageChoice
        ? await saveProductImage(imageChoice.kind === 'captured'
          ? { image: imageChoice.dataUri }
          : { url: imageChoice.url })
        : undefined;
      const product = await createProduct({
        name: form.name.trim(),
        brand: form.brand.trim() || undefined,
        category: form.category,
        quantity: 1,
        openedAt: form.openedAt || undefined,
        expiresAt: form.expiresAt || undefined,
        imageUri,
      });
      addProduct(product);
      if (recognizedPhoto) clearRecognitionPhoto(recognizedPhoto);
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
          <View style={styles.row}><Text style={[type.label, styles.label]}>제품명</Text><TextInput accessibilityLabel="제품명" value={form.name} onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))} placeholder="예: 비타민D 2000IU" placeholderTextColor={colors.textDisabled} style={styles.input} /></View>
          <View style={[styles.row, styles.divider]}><Text style={[type.label, styles.label]}>브랜드</Text><TextInput accessibilityLabel="브랜드" value={form.brand} onChangeText={(value) => setForm((prev) => ({ ...prev, brand: value }))} placeholder="예: 종근당" placeholderTextColor={colors.textDisabled} style={styles.input} /></View>
          <View style={[styles.categoryRow, styles.divider]}>
            <Text style={[type.label, styles.label]}>카테고리</Text>
            <View style={styles.chips}>{PRODUCT_CATEGORIES.map((item) => <Chip key={item} label={item} active={form.category === item} onPress={() => setForm((prev) => ({ ...prev, category: item }))} />)}</View>
          </View>
          {([['개봉일', 'openedAt'], ['유통기한', 'expiresAt']] as const).map(([label, key]) => (
            <View key={key} style={[styles.row, styles.divider]}><Text style={[type.label, styles.label]}>{label}</Text><TextInput accessibilityLabel={label} value={form[key]} onChangeText={(value) => setForm((prev) => ({ ...prev, [key]: value }))} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textDisabled} style={styles.input} /></View>
          ))}
        </View>

        <View style={styles.imageSection}>
          <Text style={type.itemName}>제품 사진</Text>
          <Text style={[type.bodySm, styles.muted]}>추천 사진을 고르거나 직접 찍은 사진을 사용할 수 있어요.</Text>
          {previewUri
            ? <Image source={{ uri: previewUri }} style={styles.selectedImage} resizeMode="contain" />
            : <View style={styles.imagePlaceholder}><AppIcon symbol="photo" fallback="image-outline" size={30} color={colors.textSecondary} /><Text style={[type.caption, styles.muted]}>선택된 사진이 없어요</Text></View>}

          {searchingImages && <Text style={[type.caption, styles.muted]}>Google에서 같은 제품 사진을 찾고 있어요…</Text>}
          {!searchingImages && suggestions.length > 0 && <View style={styles.suggestionRow}>
            {suggestions.map((suggestion) => {
              const selected = imageChoice?.kind === 'remote' && imageChoice.url === suggestion.url;
              return <Pressable key={suggestion.url} accessibilityLabel={suggestion.title || '추천 제품 사진'} onPress={() => chooseSuggestion(suggestion)} style={[styles.suggestion, selected && styles.suggestionSelected]}>
                <Image source={{ uri: suggestion.thumbnail }} style={styles.suggestionImage} resizeMode="contain" />
                {selected && <View style={styles.check}><AppIcon symbol="checkmark" fallback="checkmark" size={14} color={colors.onPrimary} /></View>}
              </Pressable>;
            })}
          </View>}
          {!searchingImages && !imageSearchConfigured && <Text style={[type.caption, styles.muted]}>Google Vision 키가 아직 설정되지 않았어요. 직접 촬영하거나 앨범에서 골라주세요.</Text>}
          <View style={styles.photoActions}>
            <Pressable onPress={() => void pickOwnPhoto(true)} style={styles.photoButton}><AppIcon symbol="camera" fallback="camera-outline" size={18} color={colors.deep} /><Text style={styles.photoButtonText}>직접 촬영</Text></Pressable>
            <Pressable onPress={() => void pickOwnPhoto(false)} style={styles.photoButton}><AppIcon symbol="photo" fallback="image-outline" size={18} color={colors.deep} /><Text style={styles.photoButtonText}>앨범에서 선택</Text></Pressable>
          </View>
        </View>

        {!canSubmit && <Text style={styles.hint}>제품명과 카테고리를 입력하면 등록할 수 있어요</Text>}
        <Button label={saving ? '등록 중…' : '등록하기'} onPress={submit} disabled={!canSubmit} />
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
  imageSection: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: spacing.xl, gap: spacing.md },
  selectedImage: { width: '100%', height: 180, borderRadius: 14, backgroundColor: colors.cream },
  imagePlaceholder: { height: 140, borderRadius: 14, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center', gap: 8 },
  suggestionRow: { flexDirection: 'row', gap: spacing.md },
  suggestion: { flex: 1, aspectRatio: 1, borderWidth: 2, borderColor: colors.divider, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.background },
  suggestionSelected: { borderColor: colors.primary },
  suggestionImage: { width: '100%', height: '100%' },
  check: { position: 'absolute', right: 5, top: 5, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  photoActions: { flexDirection: 'row', gap: spacing.md },
  photoButton: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  photoButtonText: { ...type.bodySm, color: colors.deep },
  hint: { ...type.caption, color: colors.textTertiary, textAlign: 'center' },
});
