// 3. 사진으로 확인 / 제품 등록 촬영
// 휴대폰 기본 카메라 앱으로 넘어가지 않고, 앱 화면 안에 카메라 미리보기와 촬영 틀을 띄웁니다.
// 촬영하면 틀 안(약간의 여유 포함)만 잘라서 AI에 보냅니다.
// - 제품 사진: 세로로 조금 긴 틀 (제품 앞면 전체)
// - 유통기한 사진: 가로로 긴 직사각형 틀 (날짜 줄만)
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cropToFrame, toUploadDataUri } from '@/api/photo';
import { setPendingExpiryPhoto, setPendingPhoto } from '@/api/products';
import { nav, Screen, useToast } from '@/components/shell';
import { Icon, IconBtn, T } from '@/components/ui';
import { useBusy } from '@/hooks/use-busy';
import { useApp } from '@/store/AppStore';
import { C, tx } from '@/theme/tokens';

const SHADE = 'rgba(0,0,0,0.55)';

/** 카메라 영역 크기에 맞춘 촬영 틀 위치 (카메라 영역 기준 좌표). */
function frameRect(area: { width: number; height: number }, expiry: boolean) {
  const width = Math.round(Math.min(area.width * (expiry ? 0.86 : 0.74), expiry ? 360 : 300));
  const height = Math.round(expiry ? width * 0.36 : Math.min(width * 1.2, area.height * 0.6));
  const x = Math.round((area.width - width) / 2);
  const y = Math.max(16, Math.round((area.height - height) / 2 - 28));
  return { x, y, width, height };
}

export default function Camera() {
  const { purpose, step } = useLocalSearchParams<{ purpose?: string; step?: string }>();
  const reg = purpose === 'register';
  const expiry = reg && step === 'expiry';
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { setCameraPermission } = useApp();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [area, setArea] = useState({ width: 0, height: 0 });
  const [busy, run] = useBusy();

  // 권한이 아직 없으면 한 번 요청하고, 거절되면 권한 안내 화면으로 보냅니다.
  useEffect(() => {
    if (!permission || permission.granted) return;
    if (permission.canAskAgain) {
      requestPermission().then((next) => {
        if (!next.granted) {
          setCameraPermission('denied');
          router.replace({ pathname: '/camera-permission', params: reg ? { purpose: 'register' } : {} });
        }
      });
      return;
    }
    setCameraPermission('denied');
    router.replace({ pathname: '/camera-permission', params: reg ? { purpose: 'register' } : {} });
  }, [permission, requestPermission, setCameraPermission, reg]);

  const proceed = (image: string, album: boolean) => {
    if (expiry) {
      setPendingExpiryPhoto(image);
      router.replace({ pathname: '/analyzing', params: { mode: 'register-expiry' } });
      return;
    }
    setPendingPhoto(image);
    router.replace({ pathname: '/analyzing', params: { mode: reg ? 'register-product' : 'photo', q: album ? '앨범 사진' : '촬영한 사진', ...(album ? { album: '1' } : {}) } });
  };

  const frame = frameRect(area, expiry);

  const shoot = () => run(async () => {
    if (!camera.current || !ready) return;
    try {
      const picture = await camera.current.takePictureAsync({ quality: 0.9, shutterSound: false });
      if (!picture?.uri) throw new Error('사진을 찍지 못했어요. 다시 시도해 주세요.');
      proceed(await cropToFrame(picture, area, frame), false);
    } catch (error) {
      Alert.alert('사진을 촬영하지 못했어요', error instanceof Error ? error.message : '다시 시도해 주세요.');
    }
  });

  const pickFromAlbum = () => run(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
      if (result.canceled) return;
      proceed(await toUploadDataUri(result.assets[0]), true);
    } catch (error) {
      toast(error instanceof Error ? error.message : '다시 시도해 주세요.');
    }
  });

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setArea({ width, height });
  };
  const corner = (pos: ViewStyle): ViewStyle => ({ position: 'absolute', width: 28, height: 28, borderColor: '#fff', ...pos });
  const granted = !!permission?.granted;
  const measured = area.width > 0 && area.height > 0;

  return (
    <Screen dark>
      <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}>
        <IconBtn name="close" label="닫기" color="#fff" onPress={nav.back} />
        <T style={[tx(17, 24, 600, '#fff'), { flex: 1, textAlign: 'center' }]}>{reg ? '제품 등록' : '사진으로 확인'}</T>
        {expiry ? <Pressable onPress={() => router.replace({ pathname: '/recognized', params: { expShot: '0' } })} style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 }}><T style={tx(15, 22, 500, 'rgba(255,255,255,0.8)')}>건너뛰기</T></Pressable> : <View style={{ width: 44 }} />}
      </View>
      {reg && <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: 4, paddingBottom: 8 }}>
        {['제품 사진', '유통기한'].map((label, index) => { const on = (index === 1) === expiry; return <View key={label} style={{ height: 28, paddingHorizontal: 12, borderRadius: 999, justifyContent: 'center', backgroundColor: on ? 'rgba(255,255,255,0.16)' : 'transparent' }}><T style={tx(13, 18, on ? 600 : 400, on ? '#fff' : 'rgba(255,255,255,0.5)')}>{index + 1}. {label}</T></View>; })}
      </View>}

      {/* 카메라 영역: 미리보기는 꽉 채우고, 틀 바깥은 어둡게 가립니다 */}
      <View style={{ flex: 1, overflow: 'hidden', backgroundColor: '#000' }} onLayout={onLayout}>
        {granted && <CameraView ref={camera} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} facing="back" animateShutter={false} onCameraReady={() => setReady(true)} onMountError={(e) => Alert.alert('카메라를 열지 못했어요', e.message)} />}
        {measured && <>
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: frame.y, backgroundColor: SHADE }} />
          <View style={{ position: 'absolute', left: 0, right: 0, top: frame.y + frame.height, bottom: 0, backgroundColor: SHADE }} />
          <View style={{ position: 'absolute', left: 0, width: frame.x, top: frame.y, height: frame.height, backgroundColor: SHADE }} />
          <View style={{ position: 'absolute', right: 0, width: area.width - frame.x - frame.width, top: frame.y, height: frame.height, backgroundColor: SHADE }} />
          <View pointerEvents="none" style={{ position: 'absolute', left: frame.x, top: frame.y, width: frame.width, height: frame.height }}>
            <View style={corner({ left: -3, top: -3, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 16 })} />
            <View style={corner({ right: -3, top: -3, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 16 })} />
            <View style={corner({ left: -3, bottom: -3, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 16 })} />
            <View style={corner({ right: -3, bottom: -3, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 16 })} />
            {expiry && <View style={{ position: 'absolute', left: 16, right: 16, top: frame.height / 2, height: 1, backgroundColor: 'rgba(255,255,255,0.35)' }} />}
          </View>
          <View pointerEvents="none" style={{ position: 'absolute', left: 24, right: 24, top: frame.y + frame.height + 20, alignItems: 'center' }}>
            {expiry
              ? <><T style={[tx(17, 24, 600, '#fff'), { textAlign: 'center' }]}>유통기한 날짜만 틀에 맞춰 찍어주세요</T><T style={[tx(14, 20, 400, 'rgba(255,255,255,0.75)'), { marginTop: 6, textAlign: 'center' }]}>틀 안의 부분만 AI가 읽어요</T></>
              : <T style={[tx(15, 22, 400, '#fff'), { textAlign: 'center' }]}>제품 이름이 틀 안에 잘 보이게 찍어주세요</T>}
          </View>
        </>}
        {(!granted || !ready || busy) && <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#fff" />
        </View>}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, paddingHorizontal: 36, paddingBottom: 28 + insets.bottom }}>
        <Pressable onPress={pickFromAlbum} disabled={busy} accessibilityLabel="앨범에서 선택" style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="image" size={24} color="#fff" />
        </Pressable>
        <Pressable onPress={shoot} disabled={!ready || busy} accessibilityLabel="촬영" style={{ width: 72, height: 72, opacity: ready && !busy ? 1 : 0.5 }}>
          <View style={{ position: 'absolute', left: -6, top: -6, width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(255,255,255,0.6)' }} />
          <View style={{ position: 'absolute', left: -4, top: -4, width: 80, height: 80, borderRadius: 40, backgroundColor: C.dark }} />
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff' }} />
        </Pressable>
        <View style={{ width: 48 }} />
      </View>
    </Screen>
  );
}
