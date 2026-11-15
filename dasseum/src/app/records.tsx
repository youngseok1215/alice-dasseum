// 8. 다씀 기록
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { nav, Screen, Scroll } from '@/components/shell';
import { Card, DBadge, Line, ProdImg, T, TopBar } from '@/components/ui';
import { CATEGORIES, isCurrentMonth } from '@/data/products';
import { useApp } from '@/store/AppStore';
import { C, tx } from '@/theme/tokens';

export default function Records() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const { holdList, dones } = useApp();
  const [period, setPeriod] = useState<'month' | 'all'>('month');
  const [tab, setTab] = useState<'hold' | 'done'>(params.tab === 'done' ? 'done' : 'hold');
  const month = period === 'month';
  const visibleDones = month ? dones.filter((item) => isCurrentMonth(item.date)) : dones;
  const visibleHolds = month ? holdList.filter((item) => isCurrentMonth(item.date)) : holdList;
  const doneN = visibleDones.length;
  const holdN = visibleHolds.length;
  const dist: [string, number][] = CATEGORIES.map((category) => [category, visibleDones.filter((item) => item.cat === category).length]);
  const max = Math.max(...dist.map((d) => d[1]), 1);

  const seg = (k: 'month' | 'all', l: string) => {
    const on = period === k;
    return (
      <Pressable key={k} onPress={() => setPeriod(k)} accessibilityRole="button" accessibilityState={{ selected: on }}
        style={[{ flex: 1, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.white : 'transparent' },
          on && { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 0 }, elevation: 1 }]}>
        <T style={tx(14, 32, 600, on ? C.ink : C.alt)}>{l}</T>
      </Pressable>
    );
  };

  const stat = (label: string, n: number, unit: string) => (
    <Card style={{ flex: 1, padding: 16 }}>
      <T style={tx(13, 18, 600, C.alt)}>{label}</T>
      <T style={[tx(28, 36, 700), { marginTop: 4 }]}>{n}<T style={tx(16, 24, 600, C.neutral)}>{unit}</T></T>
    </Card>
  );

  return (
    <Screen>
      <TopBar title="다씀 기록" onBack={nav.back} />
      <Scroll style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 4, paddingHorizontal: 20, paddingBottom: 28 }}>
        <View style={{ flexDirection: 'row', padding: 3, borderRadius: 10, backgroundColor: C.fillNormal }}>{seg('month', '이번 달')}{seg('all', '전체')}</View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          {stat('다씀', doneN, '개')}
          {stat('구매 보류', holdN, '회')}
        </View>
        <Card tone="mint" style={{ marginTop: 10, padding: 16 }}>
          <T style={[tx(14, 20, 700), { marginBottom: 10 }]}>카테고리별 다씀</T>
          {dist.map(([c, n]) => (
            <View key={c} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 26 }}>
              <T style={[tx(13, 18, 400, C.neutral), { width: 56 }]}>{c}</T>
              <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.7)' }}>
                <View style={{ width: `${(n / max) * 100}%`, height: 8, borderRadius: 4, backgroundColor: C.point }} />
              </View>
              <T style={[tx(13, 18, 600), { width: 24, textAlign: 'right' }]}>{n}</T>
            </View>
          ))}
        </Card>

        <View style={{ flexDirection: 'row', gap: 20, marginTop: 24 }}>
          <Line at="bottom" />
          {([['hold', '구매 보류'], ['done', '다씀']] as const).map(([k, l]) => (
            <Pressable key={k} onPress={() => setTab(k)} accessibilityRole="tab" accessibilityState={{ selected: tab === k }} style={{ paddingVertical: 10 }}>
              <T style={tx(16, 24, 600, tab === k ? C.ink : C.alt)}>{l}</T>
              {tab === k && <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, backgroundColor: C.ink }} />}
            </Pressable>
          ))}
        </View>
        {(tab === 'hold' ? visibleHolds : visibleDones).map((it, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 }}>
            <Line at="bottom" />
            <ProdImg size={44} radius={10} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <T numberOfLines={1} style={[tx(15, 22, 500), { flexShrink: 1 }]}>{it.name}</T>
                {it.isNew && <DBadge tone="mint">방금</DBadge>}
              </View>
              <T style={tx(13, 18, 400, C.alt)}>
                {'match' in it ? `${it.match} 제품 보유 · ${it.date} 보류` : `${it.cat} · ${it.date} 다씀`}
              </T>
            </View>
          </View>
        ))}
        {(tab === 'hold' ? visibleHolds : visibleDones).length === 0 && (
          <T style={[tx(15, 22, 400, C.alt), { paddingVertical: 36, textAlign: 'center' }]}>이 기간에 기록이 없어요</T>
        )}
      </Scroll>
    </Screen>
  );
}
