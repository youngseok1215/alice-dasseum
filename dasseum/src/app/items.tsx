// + 내 물품 (하단 탭) — 카테고리 칩 필터 · 사용기한 임박순 · 다씀 처리 제품 제외
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Screen, Scroll } from '@/components/shell';
import { DBadge, DButton, ddayBadge, Hair, Icon, Line, Press, ProdImg, T } from '@/components/ui';
import { byDday, CATEGORIES } from '@/data/products';
import { SyncBanner } from '@/components/sync-banner';
import { useApp } from '@/store/AppStore';
import { C, tx } from '@/theme/tokens';

const CATS = ['전체', ...CATEGORIES];

export default function Items() {
  const { products, completed, syncError, synced } = useApp();
  const [cat, setCat] = useState('전체');
  const all = products().filter((p) => !completed.includes(p.id)).sort(byDday);
  const list = cat === '전체' ? all : all.filter((p) => p.cat === cat);

  // 서버에서 아직 못 불러왔거나 실패했으면 '등록한 제품이 없어요'로 오해하지 않게 따로 안내합니다.
  if (all.length === 0 && (!synced || syncError)) return (
    <Screen tab="items">
      <View style={{ paddingTop: 16, paddingHorizontal: 20 }}><T style={tx(24, 32, 700)}>내 제품 목록</T></View>
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 20, paddingBottom: 40 }}>
        {syncError ? <SyncBanner /> : <T style={[tx(15, 22, 400, C.alt), { textAlign: 'center' }]}>내 물품을 불러오고 있어요…</T>}
      </View>
    </Screen>
  );

  // 보유 제품 0개 — 프로토타입 '내 물품 · 0개' 화면
  if (all.length === 0) return (
    <Screen tab="items">
      <View style={{ paddingTop: 16, paddingHorizontal: 20 }}><T style={tx(24, 32, 700)}>내 제품 목록</T></View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 40 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' }}>
          <Hair radius={36} />
          <Icon name="storage" size={32} color={C.neutral} />
        </View>
        <T style={[tx(20, 28, 700), { marginTop: 20, textAlign: 'center' }]}>아직 등록한 제품이 없어요</T>
        <T style={[tx(15, 22, 400, C.alt), { marginTop: 8, textAlign: 'center' }]}>{'사진을 찍거나 직접 입력해 등록하면\n사기 전에 있는지 바로 확인할 수 있어요.'}</T>
        <View style={{ alignSelf: 'stretch', marginTop: 28 }}><DButton label="제품 등록" onPress={() => router.push('/register-method')} /></View>
      </View>
    </Screen>
  );

  return (
    <Screen tab="items">
      <Scroll contentContainerStyle={{ paddingBottom: 20 }}>
        <View style={{ paddingTop: 16, paddingHorizontal: 20 }}>
          <T style={tx(24, 32, 700)}>내 제품 목록</T>
          <T style={[tx(14, 20, 400, C.alt), { marginTop: 4 }]}>보유 제품 {all.length}개 · 사용기한 임박순</T>
          <SyncBanner style={{ marginTop: 12 }} />
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
              <ProdImg size={60} radius={14} uri={p.imageUri} />
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
