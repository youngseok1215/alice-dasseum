// + 먼저 써야 할 제품 (전체보기)
import { router } from 'expo-router';
import { View } from 'react-native';
import { nav, Screen, Scroll } from '@/components/shell';
import { DBadge, Icon, Line, Press, ProdImg, T, TopBar } from '@/components/ui';
import { FIRST_IDS } from '@/data/products';
import { useApp } from '@/store/AppStore';
import { C, tx } from '@/theme/tokens';

export default function First() {
  const { product, completed } = useApp();
  const list = FIRST_IDS.filter((k) => !completed.includes(k)).map(product);
  return (
    <Screen>
      <TopBar title="먼저 써야 할 제품" onBack={nav.back} />
      <Scroll style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        <T style={tx(14, 20, 400, C.alt)}>개봉일과 사용기한을 기준으로 먼저 확인할 순서예요.</T>
        {list.length === 0 && <T style={[tx(15, 22, 400, C.alt), { paddingVertical: 40, textAlign: 'center' }]}>지금 먼저 써야 할 제품이 없어요</T>}
        <View style={{ marginTop: 8 }}>
          {list.map((p, i) => (
            <Press key={p.id} onPress={() => router.push({ pathname: '/product/[id]', params: { id: p.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 }}>
              {i < list.length - 1 && <Line at="bottom" />}
              <T style={[tx(15, 22, 700, C.neutral), { width: 20, textAlign: 'center' }]}>{i + 1}</T>
              <ProdImg size={60} radius={14} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T numberOfLines={1} style={tx(16, 24, 500)}>{p.name}</T>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  <DBadge tone="mint">{p.reason}</DBadge>
                  <DBadge tone="neutral">{p.cat}</DBadge>
                </View>
              </View>
              <Icon name="chevronRight" size={20} color={C.alt} />
            </Press>
          ))}
        </View>
      </Scroll>
    </Screen>
  );
}
