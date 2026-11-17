import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Modal, Pressable, TextInput, View } from 'react-native';
import { analyzePurchase, getPendingPurchaseAnalysis, type PurchaseAnalysis } from '@/api/products';
import { MessageIcon, Sparkle } from '@/components/ai';
import { nav, Screen, Scroll, useToast } from '@/components/shell';
import { ActionArea, Card, DBadge, DButton, Hair, Icon, T, TopBar } from '@/components/ui';
import { useOpenCamera } from '@/hooks/use-open-camera';
import { useApp } from '@/store/AppStore';
import { C, FONT, tx } from '@/theme/tokens';

const PURPOSES = ['스마트폰 충전', '노트북 충전', '여분·외출용', '기타'];
const RESULTS: Record<string, ['ok' | 'warn' | 'neutral', string, string]> = {
  '스마트폰 충전': ['ok', '가진 제품으로 충분할 수 있어요', '스마트폰 고속 충전은 대부분 25W면 충분해요. 지금 가진 충전기를 먼저 써 보고, 노트북을 함께 충전해야 할 때 다시 확인해 보세요.'],
  '노트북 충전': ['warn', '새 충전기가 필요해 보여요', '노트북은 보통 45W 이상이 필요해서 25W 충전기로는 충전이 느리거나 되지 않을 수 있어요. 노트북의 충전 규격을 확인한 뒤 구매해 보세요.'],
  '여분·외출용': ['neutral', '필요에 따라 결정해 보세요', '같은 충전기를 하나 더 두는 용도라면 지금 가진 25W 제품과 같은 사양으로도 충분해요. 출력이 더 필요하지 않다면 구매를 미뤄도 괜찮아요.'],
};


export default function AiAnalysis() {
  const openCamera = useOpenCamera();
  const { id = 'vitd', q = '', mode = 'search' } = useLocalSearchParams<{ id?: string; q?: string; mode?: string }>();
  const { product, hold, setQuery } = useApp();
  const p = product(id);
  // 프로토타입 kind: 비타민D(표기 비교) · 충전기(구매 목적 반영) · 그 외 등록 제품(이름만 비슷)
  const kind = p.id === 'vitd' ? 'vitd' : p.id === 'charger' ? 'charger' : 'generic';
  const supplement = kind === 'vitd';
  const generic = kind === 'generic';
  const med = ['영양제', '의약품'].includes(p.cat);
  const charger = kind === 'charger';
  const [sheet, setSheet] = useState(false);
  const [ask, setAsk] = useState(false);
  const [picked, setPicked] = useState('스마트폰 충전');
  const [custom, setCustom] = useState('');
  const [purpose, setPurpose] = useState<string | null>(null);
  const initialAnalysis = getPendingPurchaseAnalysis();
  const [analysis, setAnalysis] = useState<PurchaseAnalysis | undefined>(
    initialAnalysis?.query === q ? initialAnalysis : undefined,
  );
  const [analyzing, setAnalyzing] = useState(false);
  const toast = useToast();
  const result = purpose ? RESULTS[purpose] ?? ['neutral', '목적에 맞는지 확인해 보세요', `‘${purpose}’ 용도라면 필요한 출력을 먼저 확인해 보세요. 25W로 충분하다면 지금 가진 충전기를 먼저 써 보세요.`] : null;
  const onHold = () => {
    hold({ mode: mode === 'photo' ? 'photo' : 'search', query: q, verdict: 'similar', productId: p.id });
    router.replace({ pathname: '/held', params: { item: p.id } });
    toast('구매를 미뤘어요. 있는 것부터 써요');
  };
  const continuePurchase = () => { setQuery(''); router.replace('/check'); };
  const ddayText = p.dday == null ? '기한 미입력' : p.dday < 0 ? '기한 지남' : p.dday === 0 ? '오늘까지' : `D-${p.dday}`;
  const rows = generic
    ? [['카테고리', p.cat, '제품 확인'], ['개봉일', p.opened || '미개봉', '-'], ['사용기한', ddayText, '제품 확인']]
    : supplement ? [['1정 함량', '1000IU', '2000IU'], ['수량', '90정', '60정'], ['사용기한', `D-${p.dday}`, '제품 확인']] : [['출력', '25W', '65W'], ['단자', 'USB-C', 'USB-C'], ['사용기한', '해당 없음', '해당 없음']];
  const target = generic ? (q || '구매 예정 제품') : supplement ? '비타민D 2000IU' : '삼성 65W 충전기';
  const applyPurpose = async () => {
    const selected = picked === '기타' ? custom.trim() : picked;
    if (!selected) return;
    setPurpose(selected);
    setSheet(false);
    setAnalyzing(true);
    try {
      setAnalysis(await analyzePurchase(q || target, selected));
    } catch (error) {
      Alert.alert(
        '다시 분석하지 못했어요',
        error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.',
      );
    } finally {
      setAnalyzing(false);
    }
  };
  const analysisTone: 'ok' | 'warn' | 'neutral' =
    analysis?.decision === 'BUY' ? 'ok' : analysis?.decision === 'HOLD' ? 'warn' : 'neutral';
  return (
    <Screen>
      <TopBar title="AI 구매 분석" onBack={nav.back} />
      <Scroll style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Sparkle /><T style={tx(15, 22, 700, C.logo)}>{result ? '목적을 반영한 결과' : 'AI 분석 결과'}</T></View>
        <View style={{ flexDirection: 'row', marginTop: 10 }}>
          {analysis || generic || supplement || result
            ? <DBadge tone={analysis ? analysisTone : generic || supplement ? 'neutral' : result![0]}>{analyzing ? 'AI가 다시 분석하고 있어요' : analysis?.title ?? (generic ? '이름이 비슷한 제품이에요' : supplement ? '표기 정보만 비교해요' : result![1])}</DBadge>
            : <View style={{ height: 22, paddingHorizontal: 7, borderRadius: 6, backgroundColor: C.white, borderWidth: 1, borderColor: C.point, justifyContent: 'center' }}><T style={tx(12, 16, 600, C.logo)}>추가 구매가 필요할 수 있어요</T></View>}
        </View>
        {purpose && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}><T style={tx(13, 18, 500, C.neutral)}>구매 목적</T><DBadge tone="mint">{purpose}</DBadge><Pressable onPress={() => setSheet(true)}><T style={[tx(13, 18, 600, C.neutral), { textDecorationLine: 'underline' }]}>바꾸기</T></Pressable></View>}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
          {[['현재 보유', p.name, C.white], ['구매 예정', target, C.card]].map(([label, name, bg], column) => (
            <Card key={label} tone={column ? 'mint' : undefined} style={{ flex: 1, padding: 14 }}>
              <T style={tx(12, 16, 600, C.alt)}>{label}</T><T style={[tx(15, 22, 700), { marginTop: 4, minHeight: 44 }]}>{name}</T>
              <View style={{ marginTop: 10, paddingTop: 10, gap: 6 }}><View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 1, backgroundColor: C.line }} />{rows.map(([key, left, right]) => <View key={key} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 4 }}><T style={tx(13, 18, 400, C.alt)}>{key}</T><T style={tx(13, 18, key === '출력' || key === '1정 함량' ? 700 : 500, key === '출력' || key === '1정 함량' ? C.logo : C.ink)}>{column ? right : left}</T></View>)}</View>
            </Card>
          ))}
        </View>
        <View style={{ marginTop: 20 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><MessageIcon /><T style={tx(15, 22, 600)}>AI가 판단한 이유</T></View><T style={[tx(15, 23, 400, C.neutral), { marginTop: 6 }]}>{analysis?.reason ?? (generic ? '이름이 비슷한 제품을 이미 가지고 있어요. 용량이나 종류가 같은지 제품 정보를 먼저 확인해 보세요.' : supplement ? `두 제품 모두 비타민D이고 1정당 함량과 수량이 달라요. 지금 가진 제품은 사용기한이 ${p.dday}일 남아 있어요.` : result ? result[2] : '두 제품 모두 충전기지만 출력이 달라요. 노트북 충전용이라면 25W로는 부족할 수 있어요. 스마트폰만 충전한다면 지금 가진 제품으로도 충분해요.')}</T></View>
        {charger && !result && <View style={{ marginTop: 20, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, backgroundColor: C.white }}><Hair radius={12} /><T style={tx(14, 21, 500)}>정확한 판단을 위해 어디에 쓸지 알려 주세요.</T></View>}
        <View style={{ marginTop: 20, padding: 14, borderRadius: 12, backgroundColor: C.white, flexDirection: 'row', gap: 8 }}><Hair radius={12} color={C.lineNeutral} /><Icon name="circleInfo" size={18} color={C.negative} style={{ marginTop: 1.5 }} /><T style={[tx(14, 21, 400, C.neutral), { flex: 1 }]}>{supplement || med ? '영양제·의약품은 효능, 복용량, 대체 가능 여부를 AI가 판단하지 않아요. 필요하면 약사나 의사와 상담해 주세요.' : 'AI 분석은 제품 정보를 바탕으로 한 참고 의견이에요.'}</T></View>
      </Scroll>
      <ActionArea>{charger && !result ? <><DButton label="구매 목적 입력하기" onPress={() => setSheet(true)} /><DButton label="구매 보류" variant="outlined" onPress={onHold} /></> : <><DButton label="구매 보류" onPress={onHold} /><DButton label="그래도 구매할게요" variant="outlined" onPress={() => setAsk(true)} /></>}</ActionArea>
      <Modal visible={ask} transparent animationType="fade" onRequestClose={() => setAsk(false)}>
        <Pressable onPress={() => setAsk(false)} style={{ flex: 1, backgroundColor: 'rgba(23,23,25,0.4)', justifyContent: 'flex-end' }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: 20, paddingBottom: 30 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: C.lineNeutral, alignSelf: 'center', marginBottom: 20 }} />
            <T style={tx(20, 28, 700)}>구매하셨다면 내 물품에 등록할까요?</T><T style={[tx(15, 22, 400, C.alt), { marginTop: 6 }]}>등록해 두면 다음 구매 전 확인에서 바로 찾아드려요.</T>
            <View style={{ gap: 8, marginTop: 24 }}><DButton label="등록하기" icon="camera" onPress={() => { setQuery(''); setAsk(false); nav.reset('/check'); openCamera('register'); }} /><DButton label="나중에" variant="outlined" onPress={continuePurchase} /></View>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={sheet} transparent animationType="fade" onRequestClose={() => setSheet(false)}>
        <Pressable onPress={() => setSheet(false)} style={{ flex: 1, backgroundColor: 'rgba(23,23,25,0.4)', justifyContent: 'flex-end' }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: 20, paddingBottom: 30 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: C.lineNeutral, alignSelf: 'center', marginBottom: 20 }} />
            <T style={tx(20, 28, 700)}>어디에 쓰실 건가요?</T><T style={[tx(15, 22, 400, C.alt), { marginTop: 6 }]}>목적에 맞춰 다시 비교해 드려요.</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>{PURPOSES.map((item) => { const on = picked === item; return <Pressable key={item} onPress={() => setPicked(item)} style={{ height: 36, paddingHorizontal: 14, borderRadius: 18, justifyContent: 'center', backgroundColor: on ? C.mint : C.white }}><Hair radius={18} color={on ? 'transparent' : C.lineNeutral} /><T style={tx(14, 20, on ? 700 : 600, on ? C.ink : C.neutral)}>{item}</T></Pressable>; })}</View>
            {picked === '기타' && <View style={{ height: 48, borderRadius: 12, marginTop: 14, justifyContent: 'center' }}><Hair radius={12} color={C.lineNeutral} /><TextInput value={custom} onChangeText={setCustom} placeholder="예: 태블릿 충전" placeholderTextColor={C.alt} style={{ paddingHorizontal: 14, fontSize: 16, fontFamily: FONT[500], color: C.ink }} /></View>}
            <View style={{ marginTop: 20 }}><DButton label={analyzing ? '분석 중...' : '다시 분석하기'} disabled={analyzing || (picked === '기타' && !custom.trim())} onPress={applyPurpose} /></View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}
