// + 다씀 완료
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { nav, Screen } from '@/components/shell';
import { ActionArea, Card, DBadge, DButton, Mascot, ProdImg, T } from '@/components/ui';
import { TODAY } from '@/data/products';
import { useApp } from '@/store/AppStore';
import { C, tx } from '@/theme/tokens';

export default function Done() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { product, dones } = useApp();
  const p = product(id || 'vitd');
  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}>
        <Mascot kind="done" size={220} />
        <T style={[tx(24, 32, 700), { marginTop: 8, textAlign: 'center' }]}>다 쓴 제품으로 기록했어요</T>
        <T style={[tx(15, 22, 400, C.alt), { marginTop: 6, textAlign: 'center' }]}>있는 걸 먼저, 끝까지 다 썼어요.</T>
        <Card style={{ width: '100%', marginTop: 28, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <ProdImg size={48} radius={10} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <T style={tx(13, 18, 400, C.alt)}>{p.cat} · {TODAY} 다씀</T>
            <T numberOfLines={1} style={tx(15, 22, 500)}>{p.name}</T>
          </View>
          <DBadge tone="mint">다씀</DBadge>
        </Card>
        <Card style={{ width: '100%', marginTop: 10, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T style={tx(14, 20, 600, C.neutral)}>지금까지 다 쓴 제품</T>
          <T style={tx(17, 24, 700)}>{dones.length}개</T>
        </Card>
      </View>
      <ActionArea>
        <DButton label="확인" onPress={nav.back} />
        <DButton label="다씀 기록 보기" variant="outlined" onPress={() => router.push({ pathname: '/records', params: { tab: 'done' } })} />
      </ActionArea>
    </Screen>
  );
}
