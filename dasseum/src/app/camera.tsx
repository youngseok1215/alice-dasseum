// 3. 사진으로 확인 / 제품 등록 촬영
// 카메라 미리보기는 디자인 시안과 같이 자리표시 영역입니다. 실제 촬영은 expo-camera의 CameraView를 이 영역에 넣으면 됩니다.
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Pressable, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setPendingPhoto } from '@/api/products';
import { nav, Screen } from '@/components/shell';
import { Hair, Icon, IconBtn, T } from '@/components/ui';
import { C, tx } from '@/theme/tokens';

export default function Camera() {
  const { purpose } = useLocalSearchParams<{ purpose?: string }>();
  const reg = purpose === 'register';
  const insets = useSafeAreaInsets();
  const handlePhoto = async (source: 'camera' | 'library') => {
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('카메라 권한이 필요해요', '제품 사진을 촬영하려면 카메라 사용을 허용해 주세요.');
          return;
        }
      }
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, base64: true })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, base64: true });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset.base64) throw new Error('선택한 사진을 읽지 못했어요.');
      const mime = asset.mimeType && /^image\/(jpeg|png|webp)$/.test(asset.mimeType) ? asset.mimeType : 'image/jpeg';
      setPendingPhoto(`data:${mime};base64,${asset.base64}`);
      router.replace({ pathname: '/analyzing', params: { mode: reg ? 'register-photo' : 'photo', q: '' } });
    } catch (error) {
      Alert.alert('사진을 불러오지 못했어요', error instanceof Error ? error.message : '다시 시도해 주세요.');
    }
  };
  const corner = (pos: ViewStyle): ViewStyle => ({ position: 'absolute', width: 28, height: 28, borderColor: '#fff', ...pos });

  return (
    <Screen dark>
      <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}>
        <IconBtn name="close" label="닫기" color="#fff" onPress={nav.back} />
        <T style={[tx(17, 24, 600, '#fff'), { flex: 1, textAlign: 'center' }]}>{reg ? '제품 등록' : '사진으로 확인'}</T>
        <View style={{ width: 44 }} />
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <View style={{ width: 248, height: 300 }}>
          <View style={corner({ left: 0, top: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 16 })} />
          <View style={corner({ right: 0, top: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 16 })} />
          <View style={corner({ left: 0, bottom: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 16 })} />
          <View style={corner({ right: 0, bottom: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 16 })} />
          <View style={{ position: 'absolute', left: 36, right: 36, top: 36, bottom: 36, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Hair radius={14} color="rgba(255,255,255,0.16)" />
            <Icon name="image" size={28} color="rgba(255,255,255,0.7)" />
            <T style={tx(13, 18, 400, 'rgba(255,255,255,0.8)')}>카메라 미리보기</T>
          </View>
        </View>
        <T style={tx(15, 22, 400, '#fff')}>제품 이름이 잘 보이게 찍어주세요</T>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, paddingHorizontal: 36, paddingBottom: 28 + insets.bottom }}>
        <Pressable onPress={() => handlePhoto('library')} accessibilityLabel="앨범에서 선택" style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="image" size={24} color="#fff" />
        </Pressable>
        <Pressable onPress={() => handlePhoto('camera')} accessibilityLabel="촬영" style={{ width: 72, height: 72 }}>
          <View style={{ position: 'absolute', left: -6, top: -6, width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(255,255,255,0.6)' }} />
          <View style={{ position: 'absolute', left: -4, top: -4, width: 80, height: 80, borderRadius: 40, backgroundColor: C.dark }} />
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff' }} />
        </Pressable>
        <View style={{ width: 48 }} />
      </View>
    </Screen>
  );
}
