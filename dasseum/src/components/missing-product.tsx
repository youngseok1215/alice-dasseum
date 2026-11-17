// 삭제됐거나 아직 불러오지 못한 제품을 열었을 때 — product()가 예외를 던져 앱이 멈추지 않도록 대신 보여주는 화면
import { View } from 'react-native';
import { nav, Screen } from '@/components/shell';
import { ActionArea, DButton, Mascot, T, TopBar } from '@/components/ui';
import { C, tx } from '@/theme/tokens';

export function MissingProduct() {
  return (
    <Screen>
      <TopBar title="" onBack={nav.back} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 8 }}>
        <Mascot kind="search" size={140} />
        <T style={[tx(20, 28, 700), { textAlign: 'center' }]}>제품을 찾을 수 없어요</T>
        <T style={[tx(15, 22, 400, C.alt), { textAlign: 'center' }]}>삭제됐거나 아직 불러오지 못한 제품이에요.</T>
      </View>
      <ActionArea><DButton label="내 물품으로 가기" onPress={() => nav.reset('/items')} /></ActionArea>
    </Screen>
  );
}
