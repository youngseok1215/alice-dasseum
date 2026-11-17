import { router } from 'expo-router';
import { clearPendingRegistration } from '@/api/products';
import { nav, Screen, Scroll } from '@/components/shell';
import { Card, Icon, T, TopBar } from '@/components/ui';
import { useOpenCamera } from '@/hooks/use-open-camera';
import { C, tx } from '@/theme/tokens';
import { View } from 'react-native';

export default function RegisterMethod() {
  const openCamera = useOpenCamera();

  const manual = () => {
    clearPendingRegistration();
    router.push({ pathname: '/recognized', params: { manual: '1', expShot: '0' } });
  };

  return (
    <Screen>
      <TopBar title="제품 등록" onBack={nav.back} />
      <Scroll contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 }}>
        <T style={tx(24, 32, 700)}>어떻게 등록할까요?</T>
        <T style={[tx(15, 22, 400, C.alt), { marginTop: 6 }]}>
          사진을 찍어 AI로 입력하거나, 사진 없이 직접 입력할 수 있어요.
        </T>

        <View style={{ gap: 12, marginTop: 24 }}>
          <Card onPress={() => openCamera('register')} style={{ minHeight: 132, padding: 20, justifyContent: 'space-between' }}>
            <Icon name="camera" size={28} />
            <View>
              <T style={tx(18, 26, 700)}>사진으로 자동 입력</T>
              <T style={[tx(14, 20, 400, C.alt), { marginTop: 3 }]}>제품명과 사용기한을 AI가 찾아줘요</T>
            </View>
          </Card>

          <Card tone="mint" onPress={manual} style={{ minHeight: 132, padding: 20, justifyContent: 'space-between' }}>
            <Icon name="pencil" size={28} />
            <View>
              <T style={tx(18, 26, 700)}>사진 없이 직접 입력</T>
              <T style={[tx(14, 20, 400, C.neutral), { marginTop: 3 }]}>제품명을 입력하면 인터넷 사진을 추천해요</T>
            </View>
          </Card>
        </View>
      </Scroll>
    </Screen>
  );
}
