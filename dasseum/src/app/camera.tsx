// 3. 사진으로 확인 / 제품 등록 촬영
import * as ImagePicker from 'expo-image-picker';
import { toUploadDataUri } from '@/api/photo';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setPendingExpiryPhoto, setPendingPhoto } from '@/api/products';
import { nav, Screen, useToast } from '@/components/shell';
import { Hair, Icon, IconBtn, T } from '@/components/ui';
import { useApp } from '@/store/AppStore';
import { C, tx } from '@/theme/tokens';

export default function Camera() {
  const { purpose, step } = useLocalSearchParams<{ purpose?: string; step?: string }>();
  const reg = purpose === 'register';
  const expiry = reg && step === 'expiry';
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { setCameraPermission } = useApp();
  const proceed = (image: string, album: boolean) => {
    if (expiry) {
      setPendingExpiryPhoto(image);
      router.replace({ pathname: '/analyzing', params: { mode: 'register-expiry' } });
      return;
    }
    setPendingPhoto(image);
    router.replace({ pathname: '/analyzing', params: { mode: reg ? 'register-product' : 'photo', q: album ? '앨범 사진' : '촬영한 사진', ...(album ? { album: '1' } : {}) } });
  };
  const choose = async (source: 'camera' | 'library') => {
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setCameraPermission('denied');
          router.replace({ pathname: '/camera-permission', params: reg ? { purpose: 'register' } : {} });
          return;
        }
      }
      // 원본 base64는 받지 않고, 업로드 전에 줄인 사진만 base64로 만듭니다 (api/photo.ts).
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
      if (result.canceled) return;
      proceed(await toUploadDataUri(result.assets[0]), source === 'library');
    } catch (error) {
      const message = error instanceof Error ? error.message : '다시 시도해 주세요.';
      if (source === 'library') toast(message);
      else Alert.alert('사진을 촬영하지 못했어요', message);
    }
  };
  const corner = (pos: ViewStyle): ViewStyle => ({ position: 'absolute', width: 28, height: 28, borderColor: '#fff', ...pos });

  return (
    <Screen dark>
      <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}>
        <IconBtn name="close" label="닫기" color="#fff" onPress={nav.back} />
        <T style={[tx(17, 24, 600, '#fff'), { flex: 1, textAlign: 'center' }]}>{reg ? '제품 등록' : '사진으로 확인'}</T>
        {expiry ? <Pressable onPress={() => router.replace({ pathname: '/recognized', params: { expShot: '0' } })} style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 }}><T style={tx(15, 22, 500, 'rgba(255,255,255,0.8)')}>건너뛰기</T></Pressable> : <View style={{ width: 44 }} />}
      </View>
      {reg && <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: 4 }}>
        {['제품 사진', '유통기한'].map((label, index) => { const on = (index === 1) === expiry; return <View key={label} style={{ height: 28, paddingHorizontal: 12, borderRadius: 999, justifyContent: 'center', backgroundColor: on ? 'rgba(255,255,255,0.16)' : 'transparent' }}><T style={tx(13, 18, on ? 600 : 400, on ? '#fff' : 'rgba(255,255,255,0.5)')}>{index + 1}. {label}</T></View>; })}
      </View>}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <View style={{ width: expiry ? 300 : 248, height: expiry ? 150 : 300 }}>
          <View style={corner({ left: 0, top: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 16 })} />
          <View style={corner({ right: 0, top: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 16 })} />
          <View style={corner({ left: 0, bottom: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 16 })} />
          <View style={corner({ right: 0, bottom: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 16 })} />
          <View style={{ position: 'absolute', left: expiry ? 24 : 36, right: expiry ? 24 : 36, top: expiry ? 24 : 36, bottom: expiry ? 24 : 36, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Hair radius={14} color="rgba(255,255,255,0.16)" />
            <Icon name="image" size={28} color="rgba(255,255,255,0.7)" />
            <T style={tx(13, 18, 400, 'rgba(255,255,255,0.8)')}>카메라 미리보기</T>
          </View>
        </View>
        {expiry ? <View style={{ alignItems: 'center' }}><T style={tx(17, 24, 600, '#fff')}>상품의 유통기한 부분을 찍어주세요</T><T style={[tx(14, 20, 400, 'rgba(255,255,255,0.7)'), { marginTop: 6 }]}>날짜가 틀 안에 들어오면 AI가 더 정확히 읽어요</T></View> : <T style={tx(15, 22, 400, '#fff')}>제품 이름이 잘 보이게 찍어주세요</T>}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, paddingHorizontal: 36, paddingBottom: 28 + insets.bottom }}>
        <Pressable onPress={() => choose('library')} accessibilityLabel="앨범에서 선택" style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="image" size={24} color="#fff" />
        </Pressable>
        <Pressable onPress={() => choose('camera')} accessibilityLabel="촬영" style={{ width: 72, height: 72 }}>
          <View style={{ position: 'absolute', left: -6, top: -6, width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(255,255,255,0.6)' }} />
          <View style={{ position: 'absolute', left: -4, top: -4, width: 80, height: 80, borderRadius: 40, backgroundColor: C.dark }} />
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff' }} />
        </Pressable>
        <View style={{ width: 48 }} />
      </View>
    </Screen>
  );
}
