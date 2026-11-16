import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { nav, Screen, Scroll } from '@/components/shell';
import { DBadge, ddayBadge, IconBtn, Press, ProdImg, T, TopBar } from '@/components/ui';
import { useApp } from '@/store/AppStore';
import { C, tx } from '@/theme/tokens';

export default function Alerts() {
  const { products, completed, readAlerts, markAlertRead, markAlertsSeen } = useApp();
  const live = products().filter((p) => !completed.includes(p.id) && p.dday !== null && p.dday <= 30).sort((a, b) => (a.dday ?? 9999) - (b.dday ?? 9999));
  const groups = [
    ['기한 지남', live.filter((p) => (p.dday ?? 0) < 0)],
    ['7일 이내', live.filter((p) => (p.dday ?? 0) >= 0 && (p.dday ?? 0) <= 7)],
    ['30일 이내', live.filter((p) => (p.dday ?? 0) > 7)],
  ] as const;
  useEffect(() => { markAlertsSeen(); }, [markAlertsSeen]);
  return (
    <Screen>
      <TopBar title="사용기한 알림" onBack={nav.back} right={<IconBtn name="setting" label="알림 설정" onPress={() => router.push({ pathname: '/settings', params: { nested: 'notifications' } })} />} />
      <Scroll style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        {live.length === 0 && <T style={[tx(15, 22, 400, C.alt), { textAlign: 'center', paddingVertical: 80 }]}>기한이 가까운 제품이 없어요</T>}
        {groups.map(([title, list]) => list.length > 0 && (
          <View key={title} style={{ marginTop: 12 }}>
            <T style={[tx(14, 20, 600, C.alt), { paddingHorizontal: 20, marginBottom: 4 }]}>{title}</T>
            {list.map((p) => (
              <Press key={p.id} onPress={() => { markAlertRead(p.id); router.push({ pathname: '/product/[id]', params: { id: p.id } }); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 20 }}>
                <ProdImg size={48} radius={10} uri={p.imageUri} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T numberOfLines={1} style={tx(15, 22, 500)}>{p.name}</T>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>{ddayBadge(p.dday)}{!p.opened && <DBadge tone="neutral">미개봉</DBadge>}</View>
                </View>
                {!readAlerts.includes(p.id) && <View accessibilityLabel="안 읽음" style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.point }} />}
              </Press>
            ))}
          </View>
        ))}
      </Scroll>
    </Screen>
  );
}
