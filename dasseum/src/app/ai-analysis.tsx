import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Modal, Pressable, TextInput, View } from 'react-native';
import { analyzePurchase, getPendingPurchaseAnalysis, type PurchaseAnalysis } from '@/api/products';
import { MessageIcon, Sparkle } from '@/components/ai';
import { nav, Screen, Scroll, useToast } from '@/components/shell';
import { ActionArea, Card, DBadge, DButton, T, TopBar } from '@/components/ui';
import { useOpenCamera } from '@/hooks/use-open-camera';
import { MissingProduct } from '@/components/missing-product';
import { useBusy } from '@/hooks/use-busy';
import { useApp } from '@/store/AppStore';
import { C, FONT, tx } from '@/theme/tokens';

function AiAnalysisScreen() {
  const openCamera = useOpenCamera();
  const { id = '', q = '', mode = 'search' } = useLocalSearchParams<{ id?: string; q?: string; mode?: string }>();
  const { product, hold, setQuery } = useApp();
  const p = product(id);
  const cached = getPendingPurchaseAnalysis();
  const initial = cached?.query === q && cached.matches[0]?.productId === id ? cached : undefined;
  const [analysis, setAnalysis] = useState<PurchaseAnalysis | undefined>(initial);
  const [ownedDetails, setOwnedDetails] = useState(initial?.comparison?.ownedDetails ?? '');
  const [targetDetails, setTargetDetails] = useState(initial?.comparison?.targetDetails ?? '');
  const [purpose, setPurpose] = useState('');
  const [editing, setEditing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [ask, setAsk] = useState(false);
  const request = useRef<AbortController | null>(null);
  const toast = useToast();
  const [busy, run] = useBusy();
  useEffect(() => () => request.current?.abort(), []);

  const compare = async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setAnalyzing(true);
    setError('');
    setAnalysis(undefined);
    try {
      const result = await analyzePurchase(q, purpose.trim() || undefined, controller.signal, {
        productId: p.id, ownedDetails: ownedDetails.trim(), targetDetails: targetDetails.trim(),
      });
      if (!controller.signal.aborted) {
        setAnalysis(result);
        setEditing(false);
      }
    } catch (caught) {
      if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : '비교하지 못했어요. 다시 시도해 주세요.');
    } finally {
      if (!controller.signal.aborted) setAnalyzing(false);
    }
  };
  const onHold = () => run(async () => {
    try {
      await hold({ mode: mode === 'photo' ? 'photo' : 'search', query: q, verdict: analysis?.verdict === 'same' ? 'same' : 'similar', productId: p.id });
      router.replace({ pathname: '/held', params: { item: p.id } });
      toast('구매를 미뤘어요. 있는 것부터 써요');
    } catch (caught) {
      Alert.alert('구매 보류를 기록하지 못했어요', caught instanceof Error ? caught.message : '다시 시도해 주세요.');
    }
  });
  const tone = analysis?.decision === 'BUY' ? 'ok' : analysis?.decision === 'HOLD' ? 'warn' : 'neutral';
  const generated = analysis?.provider === 'Gemini' || analysis?.provider === 'Elice';
  const fields = [
    { label: '보유 제품 라벨 정보', value: ownedDetails, change: setOwnedDetails, limit: 1000, hint: '라벨에 적힌 용도, 향, 제형, 성분, 사용 가능한 소재 등' },
    { label: '구매 예정 제품 라벨 정보', value: targetDetails, change: setTargetDetails, limit: 1000, hint: '구매하려는 제품 라벨에서 확인한 내용을 입력해 주세요' },
    { label: '구매 목적 (선택)', value: purpose, change: setPurpose, limit: 200, hint: '예: 다른 향을 써 보고 싶어요' },
  ];
  return (
    <Screen>
      <TopBar title="AI 구매 분석" onBack={nav.back} />
      <Scroll style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Sparkle /><T style={tx(15, 22, 700, C.logo)}>{generated ? 'AI 제품 비교' : '제품 비교'}</T>
        </View>
        <T style={[tx(13, 19, 400, C.alt), { marginTop: 6 }]}>{analysis?.productSearch?.searched ? 'Google 검색으로 찾은 제품 설명·입력한 라벨 기준' : '제품명·입력한 라벨 기준'}</T>
        {analysis && <View style={{ marginTop: 10 }}><DBadge tone={tone}>{analysis.title}</DBadge></View>}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
          {[
            { label: '현재 보유', name: p.name, details: analysis?.comparison?.ownedDetails, profile: analysis?.productProfiles?.owned },
            { label: '구매 예정', name: q, details: analysis?.comparison?.targetDetails, profile: analysis?.productProfiles?.target },
          ].map((column, index) => (
            <Card key={column.label} tone={index ? 'mint' : undefined} style={{ flex: 1, padding: 14 }}>
              <T style={tx(12, 16, 600, C.alt)}>{column.label}</T>
              <T style={[tx(15, 22, 700), { marginTop: 4 }]}>{column.name}</T>
              {column.profile && <View style={{ marginTop: 10, gap: 6 }}>
                <T style={tx(12, 17, 500, C.alt)}>Google 검색으로 찾은 설명</T>
                {column.profile.facts.map((fact) => <T key={fact} style={tx(13, 20, 400)}>{fact}</T>)}
                {column.profile.sources.map((source) => source.url ? (
                  <Pressable key={source.label} accessibilityRole="link" onPress={() => {
                    Linking.openURL(source.url!).catch(() => Alert.alert('출처를 열지 못했어요', '인터넷 연결을 확인해 주세요.'));
                  }}>
                    <T style={[tx(12, 18, 500, C.logo), { textDecorationLine: 'underline' }]}>{source.label}</T>
                  </Pressable>
                ) : <T key={source.label} style={tx(12, 18, 400, C.alt)}>{source.label}</T>)}
              </View>}
              {column.details && <View style={{ marginTop: 12 }}>
                <T style={tx(12, 17, 500, C.alt)}>직접 입력한 라벨</T>
                <T style={[tx(13, 20, 400), { marginTop: 4 }]}>{column.details}</T>
              </View>}
            </Card>
          ))}
        </View>
        <View style={{ marginTop: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MessageIcon /><T style={tx(15, 22, 600)}>{generated ? '유사점과 차이점' : '비교 안내'}</T>
          </View>
          <T accessibilityLiveRegion="polite" style={[tx(15, 24, 400, C.neutral), { marginTop: 8 }]}>
            {analyzing ? '입력한 정보로 두 제품을 비교하고 있어요.' : error || analysis?.reason || '제품명을 기준으로 비교하거나 라벨 정보를 추가해 주세요.'}
          </T>
          {analysis?.provider === 'rules' && <T style={[tx(13, 20, 400, C.alt), { marginTop: 8 }]}>
            AI 조언을 받지 못해 기본 안내를 표시했어요. 라벨 정보를 추가하고 다시 비교할 수 있어요.
          </T>}
        </View>
        <Card style={{ marginTop: 20, padding: 14 }}>
          <T style={tx(14, 21, 600)}>집에 있는 제품</T>
          <T style={[tx(14, 21, 400, C.neutral), { marginTop: 4 }]}>
            {p.quantity ?? 1}개 · {p.opened ? '개봉 ' + p.opened : '미개봉'} · {p.dday == null ? '기한 미입력' : p.dday < 0 ? '기한 지남' : 'D-' + p.dday}
          </T>
        </Card>
        <View style={{ marginTop: 20 }}>
          <DButton label={editing ? '입력칸 접기' : '라벨 정보 추가'} variant="outlined" disabled={analyzing} onPress={() => setEditing(!editing)} />
          {editing && <View style={{ marginTop: 14, gap: 14 }}>
            <T style={tx(13, 20, 400, C.alt)}>두 제품에서 직접 확인한 내용을 입력해 주세요. 이번 비교에 반영됩니다.</T>
            {fields.map((field) => <View key={field.label}>
              <T style={tx(14, 21, 600)}>{field.label}</T>
              <TextInput accessibilityLabel={field.label} value={field.value} onChangeText={field.change}
                maxLength={field.limit} multiline editable={!analyzing} placeholder={field.hint}
                placeholderTextColor={C.alt} textAlignVertical="top"
                style={{ minHeight: 80, marginTop: 6, borderWidth: 1, borderColor: C.lineNeutral, borderRadius: 12, padding: 12, backgroundColor: C.white, fontSize: 15, fontFamily: FONT[400], color: C.ink }} />
            </View>)}
          </View>}
          <View style={{ marginTop: 10 }}>
            <DButton label={analyzing ? '비교 중...' : editing ? '입력 정보로 다시 비교' : '다시 비교하기'} disabled={analyzing || !q} onPress={compare} />
          </View>
        </View>
        <T style={[tx(13, 20, 400, C.alt), { marginTop: 16 }]}>
          {['영양제', '의약품'].includes(p.cat)
            ? '제품명과 표시 정보의 비교를 제공합니다. 복용이나 대체 가능성은 약사·의사에게 확인해 주세요.'
            : '성분·성능은 라벨에서 확인된 범위로 비교합니다. 제품 정보를 확인한 뒤 구매를 결정해 주세요.'}
        </T>
      </Scroll>
      <ActionArea>
        <DButton label="구매 보류" disabled={busy || analyzing} onPress={onHold} />
        <DButton label="그래도 구매할게요" variant="outlined" onPress={() => setAsk(true)} />
      </ActionArea>
      <Modal visible={ask} transparent animationType="fade" onRequestClose={() => setAsk(false)}>
        <Pressable onPress={() => setAsk(false)} style={{ flex: 1, backgroundColor: 'rgba(23,23,25,0.4)', justifyContent: 'flex-end' }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 30 }}>
            <T style={tx(20, 28, 700)}>구매하셨다면 내 물품에 등록할까요?</T>
            <View style={{ gap: 8, marginTop: 24 }}>
              <DButton label="등록하기" icon="camera" onPress={() => { setQuery(''); setAsk(false); nav.reset('/check'); openCamera('register'); }} />
              <DButton label="나중에" variant="outlined" onPress={() => { setQuery(''); router.replace('/check'); }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

export default function AiAnalysis() {
  const params = useLocalSearchParams<{ id?: string; q?: string }>();
  const { hasProduct } = useApp();
  if (!hasProduct(params.id)) return <MissingProduct />;
  return <AiAnalysisScreen key={params.id + '-' + params.q} />;
}
