// + 내 물품 (하단 탭) — 카테고리 칩 필터 · 사용기한 임박순 · 다씀 처리 제품 제외
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Screen, Scroll } from '@/components/shell';
import { DBadge, ddayBadge, Hair, Icon, Line, Press, ProdImg, T } from '@/components/ui';
import { ALL_IDS, CATEGORIES } from '@/data/products';
import { useApp } from '@/store/AppStore';
import { C, tx } from '@/theme/tokens';

const CATS = ['전체', ...CATEGORIES];

export default function Items() {
  const { product, completed } = useApp();
  const [cat, setCat] = useState('전체');
  const all = ALL_IDS.filter((k) => !completed.includes(k)).map(product).sort((a, b) => (a.dday ?? 1e9) - (b.dday ?? 1e9));
  const list = cat === '전체' ? all : all.filter((p) => p.cat === cat);

  return (
    <Screen tab="items">
      <Scroll contentContainerStyle={{ paddingBottom: 20 }}>
        <View style={{ paddingTop: 16, paddingHorizontal: 20 }}>
          <T style={tx(24, 32, 700)}>내 제품 목록</T>
          <T style={[tx(14, 20, 400, C.alt), { marginTop: 4 }]}>보유 제품 {all.length}개 · 사용기한 임박순</T>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 16, paddingHorizontal: 20, paddingBottom: 8 }}>
          {CATS.map((c) => {
            const on = c === cat;
            const n = c === '전체' ? all.length : all.filter((p) => p.cat === c).length;
            return (
              <Press key={c} onPress={() => setCat(c)} radius={999} style={{ height: 36, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: on ? C.mint : C.white }}>
                {!on && <Hair radius={999} color={C.lineNeutral} />}
                <T style={tx(14, 20, on ? 700 : 600, on ? '#171719' : C.neutral)}>{c}</T>
                <T style={tx(13, 18, 600, on ? '#171719' : C.alt)}>{n}</T>
              </Press>
            );
          })}
        </ScrollView>
        <View style={{ paddingHorizontal: 20 }}>
          {list.length === 0 && <T style={[tx(15, 22, 400, C.alt), { paddingVertical: 40, textAlign: 'center' }]}>이 카테고리에 등록한 제품이 없어요</T>}
          {list.map((p, i) => (
            <Press key={p.id} onPress={() => router.push({ pathname: '/product/[id]', params: { id: p.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 }}>
              {i < list.length - 1 && <Line at="bottom" />}
              <ProdImg size={60} radius={14} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T numberOfLines={1} style={tx(16, 24, 500)}>{p.name}</T>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  <DBadge tone="mint">{p.cat}</DBadge>
                  {ddayBadge(p.dday)}
                  {p.opened ? null : <DBadge tone="neutral">미개봉</DBadge>}
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
