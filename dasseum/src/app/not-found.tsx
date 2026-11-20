import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { nav, Screen } from '@/components/shell';
import { ActionArea, DButton, Hair, Icon, T, TopBar } from '@/components/ui';
import { C, tx } from '@/theme/tokens';

export default function NotFound() {
  const { stage } = useLocalSearchParams<{ stage?: string }>();
  const expiry = stage === 'expiry';
  const retake = () => router.replace({ pathname: '/camera', params: expiry ? { purpose: 'register', step: 'expiry' } : { purpose: 'register' } });
  const manual = () => router.replace({ pathname: '/recognized', params: expiry ? { expShot: '0' } : { manual: '1', expShot: '0' } });
  const tips = expiry ? ['날짜 부분이 틀 안에 꽉 차게', '빛 반사가 없는 곳에서', '흔들리지 않게 잠시 멈춰서'] : ['제품 이름이 틀 안에 들어오게', '빛 반사가 없는 곳에서', '앞면 라벨이 보이게'];
  return (
    <Screen>
      <TopBar title="제품 등록" onBack={nav.back} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 40 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' }}><Hair radius={36} /><Icon name={expiry ? 'calendar' : 'search'} size={32} color={C.neutral} /></View>
        <T style={[tx(22, 30, 700, C.red40), { marginTop: 20, textAlign: 'center' }]}>{expiry ? '유통기한을 찾지 못했어요' : '제품을 찾지 못했어요'}</T>
        <T style={[tx(15, 22, 400, C.alt), { marginTop: 8, textAlign: 'center' }]}>{expiry ? '사진에서 날짜를 읽지 못했어요.' : '사진으로 제품 정보를 확인하지 못했어요.'}{'\n'}다시 찍거나 직접 입력해 주세요.</T>
        <View style={{ alignSelf: 'stretch', marginTop: 24, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, backgroundColor: C.white, gap: 6 }}>
          <Hair radius={12} color={C.lineNeutral} />
          <T style={tx(14, 20, 600)}>다시 찍을 때 확인해 주세요</T>
          {tips.map((tip) => <View key={tip} style={{ flexDirection: 'row', gap: 8 }}><T style={tx(14, 20, 400, C.point)}>·</T><T style={tx(14, 20, 400, C.neutral)}>{tip}</T></View>)}
        </View>
      </View>
      <ActionArea><DButton label="다시 촬영" icon="camera" onPress={retake} /><DButton label="직접 입력" variant="outlined" onPress={manual} /></ActionArea>
    </Screen>
  );
}
