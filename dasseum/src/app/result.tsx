// 5. AI 확인 결과 — 동일 / 유사 / 없음
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { getPendingPurchaseAnalysis } from '@/api/products';
import { AiHead } from '@/components/ai';
import { BottomSheet } from '@/components/overlay';
import { nav, Screen, Scroll, useToast } from '@/components/shell';
import { ActionArea, Card, DBadge, DButton, ddayBadge, Hair, Icon, Line, ProdImg, T, TopBar } from '@/components/ui';
import { matchOwnedProducts, type CheckMode } from '@/data/products';
import { useOpenCamera } from '@/hooks/use-open-camera';
import { useApp } from '@/store/AppStore';
import { C, FONT, tx } from '@/theme/tokens';

export default function Result() {
  const params = useLocalSearchParams<{ mode?: string; q?: string; album?: string; pv?: string }>();
  const mode = (params.mode === 'photo' ? 'photo' : 'search') as CheckMode;
  const q = params.q ?? '';
  const album = params.album === '1';
  const { product, products, completed, hold, setQuery } = useApp();
  const toast = useToast();
  const openCamera = useOpenCamera();
  const [ask, setAsk] = useState(false);
  const pendingAnalysis = getPendingPurchaseAnalysis();
  const aiResult = pendingAnalysis?.query === q ? pendingAnalysis : undefined;
  const r = aiResult
    ? { verdict: aiResult.verdict, items: aiResult.matches.map((item) => item.productId) }
    : matchOwnedProducts(q, products().filter((item) => !completed.includes(item.id)));

  const V = {
    same: {
      badge: <View style={{ height: 22, justifyContent: 'center' }}><T style={{ fontSize: 12, lineHeight: 16, fontFamily: FONT[600], letterSpacing: 0.24, color: C.red40 }}>동일 제품 있음</T></View>,
      title: aiResult?.verdict === 'same' ? aiResult.title : '이미 가지고 있어요', sub: `내 물품에 같은 제품이 ${r.items.length}개 있어요.`,
    },
    similar: { badge: <DBadge tone="mint">유사 제품 있음</DBadge>, title: aiResult?.title ?? '비슷한 제품이 있어요', sub: '같은 종류의 제품을 가지고 있어요. 어떻게 다른지는 AI 비교에서 확인해 보세요.' },
    none: { badge: <DBadge tone="ok">보유 제품 없음</DBadge>, title: aiResult?.title ?? '가지고 있는 제품이 없어요', sub: `내 물품에서 ‘${q}’과 같거나 비슷한 제품을 찾지 못했어요.` },
  }[r.verdict];
  const isSupp = r.items.some((k) => ['영양제', '의약품'].includes(product(k).cat));

  const onHold = () => {
    hold({ mode, query: q, verdict: r.verdict, productId: r.items[0] });
    router.push({ pathname: '/held', params: { item: r.items[0] } });
    toast('구매를 미뤘어요. 있는 것부터 써요');
  };
  const onContinue = () => { setAsk(false); setQuery(''); nav.reset('/check'); };
  // '등록하기': 구매 전 확인을 처음 상태로 돌리고 제품 등록 촬영으로
  const onRegister = () => { onContinue(); openCamera('register'); };
  const retry = () => (mode === 'photo' ? openCamera(undefined, { replace: true }) : nav.back());

  return (
    <Screen>
      <TopBar title="확인 결과" onBack={nav.back} />
      <Scroll style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 4, paddingHorizontal: 20, paddingBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#70737C0D', marginBottom: 20 }}>
          <Icon name={mode === 'photo' ? 'camera' : 'search'} size={18} color={C.alt} />
          <T style={tx(14, 20, 400, C.neutral)}>{mode === 'photo' ? (album ? '앨범 사진으로 확인했어요' : '촬영한 사진으로 확인했어요') : `‘${q}’ 확인 결과`}</T>
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
                <DButton size="md" variant="outlined" label="보유 제품 상세 보기" onPress={() => router.push({ pathname: '/product/[id]', params: { id: k, from: 'result' } })} />
              </View>
            </Card>
          );
        })}

        {r.verdict === 'similar' && (
          <View style={{ marginTop: 12, padding: 16, borderRadius: 16, backgroundColor: C.card }}>
            <Hair radius={16} color={C.logo} width={2} />
            <AiHead title="AI 구매 분석" />
            <T style={[tx(15, 22, 500), { marginTop: 6 }]}>두 제품이 어떻게 다른지, 지금 가진 걸로 충분한지 비교해 볼까요?</T>
            <View style={{ marginTop: 12 }}><DButton size="md" label="두 제품 비교하기" onPress={() => router.push({ pathname: '/ai-analysis', params: { id: r.items[0], q, mode } })} /></View>
          </View>
        )}

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
            <DButton label="확인 완료" onPress={() => setAsk(true)} />
            <DButton label={mode === 'photo' ? '다시 촬영하기' : '검색어 바꿔 확인하기'} variant="outlined" onPress={retry} />
          </>
        ) : (
          <>
            <DButton label="구매 보류" onPress={onHold} />
            <DButton label="그래도 구매할게요" variant="outlined" onPress={() => setAsk(true)} />
          </>
        )}
      </ActionArea>

      <BottomSheet visible={ask} onClose={() => setAsk(false)}>
        <T style={tx(20, 28, 700)}>구매하셨다면 내 물품에 등록할까요?</T>
        <T style={[tx(15, 22, 400, C.alt), { marginTop: 6 }]}>등록해 두면 다음 구매 전 확인에서 바로 찾아드려요.</T>
        <View style={{ gap: 8, marginTop: 24 }}>
          <DButton label="등록하기" icon="camera" onPress={onRegister} />
          <DButton label="나중에" variant="outlined" onPress={onContinue} />
        </View>
      </BottomSheet>
    </Screen>
  );
}
