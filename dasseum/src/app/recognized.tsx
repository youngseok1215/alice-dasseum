import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, Platform, Pressable, TextInput, View } from 'react-native';
import {
  saveProductImage,
  searchProductImages,
  type ProductImageSuggestion,
} from '@/api/product-images';
import {
  clearPendingRegistration,
  getPendingPhoto,
  getPendingSuggestion,
} from '@/api/products';
import { DateField } from '@/components/DateField';
import { nav, Screen, Scroll, useToast } from '@/components/shell';
import { ActionArea, DBadge, DButton, Hair, Icon, T, TopBar } from '@/components/ui';
import { CATEGORIES } from '@/data/products';
import { useApp } from '@/store/AppStore';
import { C, FONT, tx } from '@/theme/tokens';

type ImageChoice =
  | { kind: 'captured'; dataUri: string }
  | { kind: 'remote'; url: string; preview: string }
  | { kind: 'existing'; uri: string };

function Label({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 6 }}>
      <T style={tx(14, 20, 600, C.neutral)}>{children}</T>
      {hint ? <T style={[tx(12, 16, 400, C.alt), { marginBottom: 2 }]}>{hint}</T> : null}
    </View>
  );
}

export default function Recognized() {
  const { manual, expShot, edit } = useLocalSearchParams<{ manual?: string; expShot?: string; edit?: string }>();
  const { registerProduct, updateProduct, product } = useApp();
  const toast = useToast();
  const suggestion = getPendingSuggestion();
  const capturedPhoto = getPendingPhoto();
  const existing = edit ? product(edit) : null;
  const isManual = !existing && manual === '1';
  const expiryRead = expShot !== '0';
  const dt = (value: string | null) => (value ? value.replace(/\./g, '-') : '');
  const [form, setForm] = useState(existing
    ? { name: existing.name, cat: existing.cat as string, opened: dt(existing.opened), expires: dt(existing.expires) }
    : {
      name: isManual ? '' : suggestion?.name || '',
      cat: isManual ? '' : suggestion?.category || '',
      opened: '',
      expires: !isManual && expiryRead ? suggestion?.expiresAt || '' : '',
    });
  const [focus, setFocus] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<ProductImageSuggestion[]>([]);
  const [searchingImages, setSearchingImages] = useState(Boolean(capturedPhoto && !existing));
  const [imageSearchConfigured, setImageSearchConfigured] = useState(true);
  const [imageSearchSource, setImageSearchSource] = useState(capturedPhoto);
  const [imageChoice, setImageChoice] = useState<ImageChoice | undefined>(() => {
    if (existing?.imageUri) return { kind: 'existing', uri: existing.imageUri };
    if (capturedPhoto) return { kind: 'captured', dataUri: capturedPhoto };
    return undefined;
  });
  const userPickedImage = useRef(false);

  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const ok = Boolean(form.name.trim() && form.cat) && !saving;
  const previewUri = imageChoice?.kind === 'captured'
    ? imageChoice.dataUri
    : imageChoice?.kind === 'remote'
      ? imageChoice.preview
      : imageChoice?.uri;

  useEffect(() => {
    if (!imageSearchSource || existing) return;
    const controller = new AbortController();
    searchProductImages(imageSearchSource, controller.signal)
      .then((result) => {
        setImageSearchConfigured(result.configured);
        setSuggestions(result.images);
        if (result.images[0] && !userPickedImage.current) {
          setImageChoice({ kind: 'remote', url: result.images[0].url, preview: result.images[0].thumbnail });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setSuggestions([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setSearchingImages(false);
      });
    return () => controller.abort();
  }, [existing, imageSearchSource]);

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
        quality: 0.72,
        base64: true,
        allowsEditing: true,
        aspect: [1, 1],
      };
      const result = await (camera && Platform.OS !== 'web'
        ? ImagePicker.launchCameraAsync(options)
        : ImagePicker.launchImageLibraryAsync(options));
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset.base64) throw new Error('사진을 읽지 못했어요.');
      const mime = asset.mimeType && /^image\/(jpeg|png|webp)$/.test(asset.mimeType) ? asset.mimeType : 'image/jpeg';
      const dataUri = `data:${mime};base64,${asset.base64}`;
      userPickedImage.current = true;
      setImageChoice({ kind: 'captured', dataUri });
      setSearchingImages(true);
      setImageSearchSource(dataUri);
    } catch (error) {
      Alert.alert('사진을 열지 못했어요', error instanceof Error ? error.message : '다시 시도해 주세요.');
    }
  };

  const submit = async () => {
    if (!ok) return;
    setSaving(true);
    try {
      const imageUri = imageChoice
        ? imageChoice.kind === 'captured'
          ? await saveProductImage({ image: imageChoice.dataUri })
          : imageChoice.kind === 'remote'
            ? await saveProductImage({ url: imageChoice.url })
            : imageChoice.uri
        : undefined;
      const cat = form.cat as (typeof CATEGORIES)[number];
      if (existing) {
        await updateProduct(existing.id, {
          name: form.name,
          cat,
          opened: form.opened,
          expires: form.expires,
          brand: existing.brand,
          imageUri,
        });
        nav.back();
        toast('제품 정보를 수정했어요');
        return;
      }
      await registerProduct({
        name: form.name,
        cat,
        opened: form.opened,
        expires: form.expires,
        manual: isManual,
        brand: suggestion?.brand || undefined,
        imageUri,
      });
      clearPendingRegistration();
      router.replace('/registered');
    } catch (error) {
      Alert.alert(existing ? '제품을 수정하지 못했어요' : '제품을 등록하지 못했어요', error instanceof Error ? error.message : '다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <TopBar title={existing ? '제품 수정' : isManual ? '직접 입력' : 'AI 인식 완료'} onBack={nav.back} />
      <Scroll style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 4, paddingHorizontal: 20, paddingBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: C.fillAlt, marginBottom: 20 }}>
          <Icon name="camera" size={18} color={C.alt} />
          <T style={tx(14, 20, 400, C.neutral)}>{existing ? '등록한 정보를 고칠 수 있어요' : isManual ? '제품 정보를 직접 입력해 주세요' : '촬영한 사진에서 정보를 찾았어요'}</T>
        </View>
        <View style={{ flexDirection: 'row' }}><DBadge tone={existing || isManual ? 'neutral' : 'mint'}>{existing ? '수정' : isManual ? '직접 입력' : '인식 완료'}</DBadge></View>
        <T style={[tx(24, 32, 700), { marginTop: 10 }]}>
          {existing ? '제품 정보 수정' : isManual ? '제품 정보를 입력해 주세요' : suggestion?.name ? `${suggestion.name} 정보를 찾았어요` : '인식한 정보를 확인해 주세요'}
        </T>
        <T style={[tx(15, 22, 400, C.alt), { marginTop: 4 }]}>{existing ? '바뀐 내용을 고친 뒤 저장해 주세요.' : isManual ? '제품명과 카테고리는 꼭 입력해 주세요.' : 'AI가 잘못 읽었을 수 있어요. 확인하고 다르면 고쳐 주세요.'}</T>

        <View style={{ gap: 18, marginTop: 24 }}>
          <View>
            <Label>제품명</Label>
            <View style={{ height: 48, borderRadius: 12, backgroundColor: C.white, justifyContent: 'center' }}>
              <Hair radius={12} color={focus ? C.point : C.lineNeutral} width={focus ? 2 : 1} />
              <TextInput value={form.name} onChangeText={(value) => set('name', value)} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
                placeholder="제품명을 입력하세요" placeholderTextColor={C.alt} allowFontScaling={false}
                style={{ height: 48, paddingHorizontal: 14, paddingVertical: 0, fontSize: 16, fontFamily: FONT[500], letterSpacing: 0.096, color: C.ink }} />
            </View>
          </View>
          <View>
            <Label>카테고리</Label>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {CATEGORIES.map((category) => {
                const on = form.cat === category;
                return (
                  <Pressable key={category} onPress={() => set('cat', category)} accessibilityRole="button" accessibilityState={{ selected: on }}
                    style={{ height: 36, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center', backgroundColor: on ? C.mint : C.white }}>
                    {!on && <Hair radius={999} color={C.lineNeutral} />}
                    <T style={tx(14, 20, on ? 700 : 600, on ? C.ink : C.neutral)}>{category}</T>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View>
            <Label hint={existing ? undefined : isManual ? '비워 두면 미개봉으로 저장돼요' : '개봉일 표기가 없으면 비워 두세요'}>개봉일</Label>
            <DateField value={form.opened} onChange={(value) => set('opened', value)} />
          </View>
          <View>
            <Label hint={existing || isManual ? undefined : expiryRead ? '유통기한 사진에서 읽었어요' : '사진을 건너뛰었어요. 직접 입력해 주세요'}>유통기한</Label>
            <DateField value={form.expires} onChange={(value) => set('expires', value)} />
          </View>

          <View>
            <Label hint="추천 사진 또는 직접 찍은 사진">제품 사진</Label>
            <View style={{ minHeight: 180, borderRadius: 16, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <Hair radius={16} color={C.lineNeutral} />
              {previewUri
                ? <Image source={{ uri: previewUri }} contentFit="contain" style={{ width: '100%', height: 180 }} accessibilityLabel="선택한 제품 사진" />
                : <><Icon name="image" size={32} color={C.imageIcon} /><T style={[tx(13, 18, 400, C.alt), { marginTop: 6 }]}>선택한 사진이 없어요</T></>}
            </View>
            {searchingImages && <T style={[tx(13, 18, 400, C.alt), { marginTop: 8 }]}>인터넷에서 같은 제품 사진을 찾고 있어요…</T>}
            {!searchingImages && suggestions.length > 0 && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                {suggestions.slice(0, 3).map((item) => {
                  const selected = imageChoice?.kind === 'remote' && imageChoice.url === item.url;
                  return (
                    <Pressable key={item.url} onPress={() => { userPickedImage.current = true; setImageChoice({ kind: 'remote', url: item.url, preview: item.thumbnail }); }}
                      accessibilityLabel={item.title || '추천 제품 사진'} style={{ flex: 1, aspectRatio: 1, borderRadius: 12, borderWidth: 2, borderColor: selected ? C.point : C.lineNeutral, overflow: 'hidden', backgroundColor: C.white }}>
                      <Image source={{ uri: item.thumbnail }} contentFit="contain" style={{ width: '100%', height: '100%' }} />
                      {selected && <View style={{ position: 'absolute', right: 5, top: 5, width: 22, height: 22, borderRadius: 11, backgroundColor: C.point, alignItems: 'center', justifyContent: 'center' }}><T style={tx(13, 18, 700, '#fff')}>✓</T></View>}
                    </Pressable>
                  );
                })}
              </View>
            )}
            {!searchingImages && !imageSearchConfigured && <T style={[tx(13, 18, 400, C.alt), { marginTop: 8 }]}>이미지 검색 키가 설정되지 않았어요. 촬영한 사진이나 앨범 사진을 사용해 주세요.</T>}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              {capturedPhoto && <View style={{ flex: 1 }}><DButton size="md" variant="outlined" label="촬영한 사진" onPress={() => { userPickedImage.current = true; setImageChoice({ kind: 'captured', dataUri: capturedPhoto }); }} /></View>}
              <View style={{ flex: 1 }}><DButton size="md" variant="outlined" label="직접 촬영" onPress={() => void pickOwnPhoto(true)} /></View>
              <View style={{ flex: 1 }}><DButton size="md" variant="outlined" label="앨범 선택" onPress={() => void pickOwnPhoto(false)} /></View>
            </View>
          </View>
        </View>
      </Scroll>
      <ActionArea><DButton label={saving ? '저장 중...' : existing ? '저장' : '등록 완료'} disabled={!ok} onPress={submit} /></ActionArea>
    </Screen>
  );
}

