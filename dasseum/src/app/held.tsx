// 7. 구매 보류 완료
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { nav, Screen } from '@/components/shell';
import { ActionArea, Card, DButton, ddayBadge, Mascot, ProdImg, T } from '@/components/ui';
import { useApp } from '@/store/AppStore';
import { C, tx } from '@/theme/tokens';

export default function Held() {
  const { item } = useLocalSearchParams<{ item?: string }>();
  const { product, holdList } = useApp();
  const p = product(item || 'vitd');
  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}>
        <Mascot kind="hold" size={180} />
        <T style={[tx(24, 32, 700), { marginTop: 12, textAlign: 'center' }]}>구매를 미뤘어요</T>
        <T style={[tx(15, 22, 400, C.alt), { marginTop: 6, textAlign: 'center' }]}>가지고 있는 제품부터 끝까지 써 봐요.</T>
        <Card style={{ width: '100%', marginTop: 28, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <ProdImg size={48} radius={10} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <T style={tx(13, 18, 400, C.alt)}>보유 중인 제품</T>
            <T numberOfLines={1} style={tx(15, 22, 500)}>{p.name}</T>
          </View>
          {ddayBadge(p.dday)}
        </Card>
        <Card style={{ width: '100%', marginTop: 10, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T style={tx(14, 20, 600, C.neutral)}>이번 달 구매 보류</T>
          <T style={tx(17, 24, 700)}>{holdList.length}회</T>
        </Card>
      </View>
      <ActionArea>
        <DButton label="확인" onPress={() => nav.reset('/check')} />
        <DButton label="구매 보류 기록 보기" variant="outlined" onPress={() => router.push({ pathname: '/records', params: { tab: 'hold' } })} />
      </ActionArea>
    </Screen>
  );
}
