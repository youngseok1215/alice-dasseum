// 5. AI 확인 결과 — 동일 / 유사 / 없음
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { nav, Screen, Scroll, useToast } from '@/components/shell';
import { ActionArea, Card, DBadge, DButton, ddayBadge, Hair, Icon, Line, ProdImg, T, TopBar } from '@/components/ui';
import { matchOwnedProducts, type CheckMode } from '@/data/products';
import { useApp } from '@/store/AppStore';
import { C, FONT, tx } from '@/theme/tokens';

export default function Result() {
  const params = useLocalSearchParams<{ mode?: string; q?: string }>();
  const mode = (params.mode === 'photo' ? 'photo' : 'search') as CheckMode;
  const q = params.q ?? '';
  const { product, productIds, hold, setQuery } = useApp();
  const toast = useToast();
  const r = matchOwnedProducts(q, productIds.map(product));

  const V = {
    same: {
      badge: <View style={{ height: 22, justifyContent: 'center' }}><T style={{ fontSize: 12, lineHeight: 16, fontFamily: FONT[600], letterSpacing: 0.24, color: C.red40 }}>동일 제품 있음</T></View>,
      title: '이미 가지고 있어요', sub: `내 물품에 같은 제품이 ${r.items.length}개 있어요.`,
    },
    similar: { badge: <DBadge tone="mint">유사 제품 있음</DBadge>, title: '비슷한 제품이 있어요', sub: '제품명·브랜드·용량이 비슷한 제품이에요.' },
    none: { badge: <DBadge tone="ok">보유 제품 없음</DBadge>, title: '가지고 있는 제품이 없어요', sub: `내 물품에서 ‘${q}’과 같거나 비슷한 제품을 찾지 못했어요.` },
  }[r.verdict];
  const isSupp = r.items.some((k) => ['영양제', '의약품'].includes(product(k).cat));

  const onHold = () => {
    hold({ mode, query: q, verdict: r.verdict, productId: r.items[0] });
    router.push({ pathname: '/held', params: { item: r.items[0] } });
    toast('구매를 미뤘어요. 있는 것부터 써요');
  };
  const onContinue = () => { setQuery(''); nav.reset('/check'); };

  return (
    <Screen>
      <TopBar title="확인 결과" onBack={nav.back} />
      <Scroll style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 4, paddingHorizontal: 20, paddingBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: C.fillAlt, marginBottom: 20 }}>
          <Icon name={mode === 'photo' ? 'camera' : 'search'} size={18} color={C.alt} />
          <T style={tx(14, 20, 400, C.neutral)}>{mode === 'photo' ? '촬영한 사진으로 확인했어요' : `‘${q}’ 확인 결과`}</T>
        </View>
        <View style={{ flexDirection: 'row' }}>{V.badge}</View>
        <T style={[tx(24, 32, 700), { marginTop: 10 }]}>{V.title}</T>
        <T style={[tx(15, 22, 400, C.alt), { marginTop: 4 }]}>{V.sub}</T>

        {r.items.map((k) => {
          const p = product(k);
          return (
            <Card key={k} style={{ marginTop: 20, padding: 16 }}>
              <View style={{ flexDirection: 'row', gap: 14 }}>
                <ProdImg size={72} uri={p.imageUri} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T style={tx(13, 18, 400, C.alt)}>{p.brand} · {p.cat}</T>
                  <T style={[tx(16, 24, 500), { marginTop: 2 }]}>{p.name}</T>
                  {r.verdict === 'similar' && <T style={[tx(13, 18, 400, C.neutral), { marginTop: 4 }]}>입력한 제품과 이름·브랜드·용량이 비슷해요</T>}
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 14, paddingTop: 14 }}>
                <Line at="top" />
                <View style={{ gap: 6 }}>
                  <T style={tx(14, 20, 400, C.alt)}>개봉일</T>
                  <T style={tx(14, 20, 400, C.alt)}>사용기한</T>
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  <T style={tx(14, 20, 600)}>{p.opened ? `${p.opened} 개봉` : '미개봉'}</T>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <T style={tx(14, 20, 600)}>{p.expires}</T>
                    {ddayBadge(p.dday)}
                  </View>
                </View>
              </View>
              <View style={{ marginTop: 14 }}>
                <DButton size="md" variant="outlined" label="보유 제품 상세 보기" onPress={() => router.push({ pathname: '/product/[id]', params: { id: k } })} />
              </View>
            </Card>
          );
        })}

        <View style={{ marginTop: 20, padding: 14, borderRadius: 12, backgroundColor: C.white, flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <Hair radius={12} color={C.lineNeutral} />
          <Icon name="circleInfo" size={18} color={C.negative} style={{ marginTop: 1.5 }} />
          <T style={[tx(14, 21, 400, C.neutral), { letterSpacing: 0, flexShrink: 1 }]}>
            AI 결과는 참고용이니 실제 제품을 확인해 주세요.{isSupp ? '\n영양제·의약품의 효능·대체 여부는 안내하지 않아요.' : ''}
          </T>
        </View>
      </Scroll>
      <ActionArea>
        {r.verdict === 'none' ? (
          <>
            <DButton label="확인 완료" onPress={onContinue} />
            <DButton label="다시 확인하기" variant="outlined" onPress={() => nav.reset('/check')} />
          </>
        ) : (
          <>
            <DButton label="구매 보류" onPress={onHold} />
            <DButton label="그래도 구매할게요" variant="outlined" onPress={onContinue} />
          </>
        )}
      </ActionArea>
    </Screen>
  );
}
