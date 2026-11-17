import { Camera } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { Linking, View } from 'react-native';
import { nav, Screen, useToast } from '@/components/shell';
import { ActionArea, DButton, Hair, Icon, T, TextBtn, TopBar } from '@/components/ui';
import { useApp } from '@/store/AppStore';
import { C, tx } from '@/theme/tokens';

export default function CameraPermission() {
  const { purpose } = useLocalSearchParams<{ purpose?: string }>();
  const register = purpose === 'register';
  const { cameraPermission, setCameraPermission } = useApp();
  const toast = useToast();
  const denied = cameraPermission === 'denied';
  const allow = async () => {
    const result = await Camera.requestCameraPermissionsAsync();
    const state = result.granted ? 'granted' : 'denied';
    setCameraPermission(state);
    if (result.granted) router.replace({ pathname: '/camera', params: register ? { purpose: 'register' } : {} });
  };
  return (
    <Screen>
      <TopBar title={register ? '제품 등록' : '사진으로 확인'} onBack={nav.back} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 40 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: denied ? C.white : C.card, alignItems: 'center', justifyContent: 'center' }}>
          {denied && <Hair radius={36} />}
          <Icon name="camera" size={32} />
        </View>
        <T style={[tx(22, 30, 700), { marginTop: 20, textAlign: 'center' }]}>{denied ? '카메라 권한이 꺼져 있어요' : '카메라 권한이 필요해요'}</T>
        <T style={[tx(15, 22, 400, C.alt), { marginTop: 8, textAlign: 'center' }]}>
          {denied ? (register ? '설정에서 권한을 켜거나, 제품 정보를 직접 입력해 등록할 수 있어요.' : '설정에서 권한을 켜거나, 제품 이름을 검색해 확인할 수 있어요.') : '제품 사진에서 이름과 유통기한을 읽기 위해 사용해요.'}
        </T>
      </View>
      <ActionArea>
        {denied ? (
          <>
            <DButton label={register ? '직접 등록하기' : '검색으로 확인하기'} onPress={() => register ? router.replace({ pathname: '/recognized', params: { manual: '1', expShot: '0' } }) : router.replace('/check')} />
            <DButton label="설정 열기" variant="outlined" onPress={() => Linking.openSettings().catch(() => toast('기기 설정에서 카메라 권한을 켜 주세요'))} />
          </>
        ) : (
          <>
            <DButton label="허용하기" onPress={allow} />
            <View style={{ alignItems: 'center' }}><TextBtn onPress={() => setCameraPermission('denied')}>허용 안 함</TextBtn></View>
          </>
        )}
      </ActionArea>
    </Screen>
  );
}
