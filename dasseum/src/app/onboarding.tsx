import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, View, type LayoutRectangle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Screen } from '@/components/shell';
import { Card, DButton, Icon, IconBtn, Mascot, ProdImg, SectionHead, T } from '@/components/ui';
import { FIRST_IDS } from '@/data/products';
import { useOpenCamera } from '@/hooks/use-open-camera';
import { useApp } from '@/store/AppStore';
import { BRAND_FONT, C, tx } from '@/theme/tokens';

const COACH = '#1E8C7E';
const STEPS = [
  { key: 'reg', title: '가진 제품을 찍어 등록해요', body: '‘제품 등록’을 누르고 사진을 찍으면 AI가 제품명과 카테고리를 읽어요. 잘못 읽은 정보는 직접 고칠 수 있어요.' },
  { key: 'check', title: '사기 전에 있는지 확인할 수 있어요', body: '‘구매 전 확인’에서 사려는 제품을 검색하거나 찍으면 내 물품에서 같은 제품, 비슷한 제품을 찾아줘요.' },
  { key: 'first', title: '있는 것부터 끝까지 써요', body: '개봉일과 사용기한을 보고 먼저 쓸 제품을 알려줘요. 다 쓰면 ‘다씀’으로 기록해요.' },
] as const;

type TargetKey = (typeof STEPS)[number]['key'];
type Rect = LayoutRectangle;

export default function Onboarding() {
  const openCamera = useOpenCamera();
  const [index, setIndex] = useState(0);
  const [rects, setRects] = useState<Partial<Record<TargetKey, Rect>>>({});
  const [root, setRoot] = useState({ width: 0, height: 0 });
  const { finishOnboarding, product } = useApp();
  const firsts = FIRST_IDS.map(product);
  const step = STEPS[index];
  const last = index === STEPS.length - 1;
  const rootRef = useRef<ComponentRef<typeof View>>(null);
  const regRef = useRef<ComponentRef<typeof View>>(null);
  const checkRef = useRef<ComponentRef<typeof View>>(null);
  const firstRef = useRef<ComponentRef<typeof View>>(null);

  const measure = useCallback(() => {
    const targets = { reg: regRef, check: checkRef, first: firstRef };
    rootRef.current?.measureInWindow((rx, ry) => {
      (Object.keys(targets) as TargetKey[]).forEach((key) => {
        targets[key].current?.measureInWindow((x, y, width, height) => {
          setRects((old) => ({ ...old, [key]: { x: x - rx, y: y - ry, width, height } }));
        });
      });
    });
  }, []);
  useEffect(() => { const timer = setTimeout(measure, 80); return () => clearTimeout(timer); }, [measure, root.width]);

  const finish = (register = false) => {
    finishOnboarding();
    router.replace('/home');
    if (register) openCamera('register');
  };
  const next = () => last ? finish(true) : setIndex((v) => v + 1);
  const active = rects[step.key];
  const pad = 6;

  return (
    <Screen tab="home">
      <View ref={rootRef} collapsable={false} onLayout={(e) => { setRoot(e.nativeEvent.layout); setTimeout(measure, 0); }} style={{ flex: 1, overflow: 'hidden' }}>
        <ScrollView pointerEvents="none" scrollEnabled={false} showsVerticalScrollIndicator={false}>
          <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 8 }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <T style={{ fontFamily: BRAND_FONT, fontSize: 22, lineHeight: 27, letterSpacing: 1.32, color: C.logo }}>다씀</T>
              <Svg width={14} height={14} viewBox="0 0 20 20" style={{ marginTop: 6 }}><Circle cx={10} cy={10} r={10} fill={C.point} /><Path d="M5.5 10.5 L8.7 13.6 L14.5 7" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" /></Svg>
            </View>
            <IconBtn name="bell" label="사용기한 알림" />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 4, paddingRight: 12, paddingBottom: 20, paddingLeft: 20, marginTop: -10 }}>
            <View style={{ flex: 1 }}><T style={tx(20, 28, 700)}>{'확인이 필요한 제품이\n2개 있어요'}</T><T style={[tx(13, 19, 400, C.homeSub), { marginTop: 6 }]}>있는 걸 먼저, 끝까지 다 쓰는 습관</T></View>
            <Mascot kind="smile" size={154} />
          </View>
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingBottom: 28 }}>
            <View ref={regRef} collapsable={false} style={{ flex: 1 }}><Card style={{ height: 112, padding: 16, justifyContent: 'space-between' }}><Icon name="camera" size={24} /><View><T style={tx(16, 24, 800)}>제품 등록</T><T style={tx(13, 18, 400, C.alt)}>찍어서 내 물품에 추가</T></View></Card></View>
            <View ref={checkRef} collapsable={false} style={{ flex: 1 }}><Card tone="mint" style={{ height: 112, padding: 16, justifyContent: 'space-between' }}><Icon name="search" size={24} /><View><T style={tx(16, 24, 800)}>구매 전 확인</T><T style={tx(13, 18, 400, C.neutral)}>사기 전에 먼저 확인해요</T></View></Card></View>
          </View>
          <View ref={firstRef} collapsable={false}>
            <SectionHead title="먼저 써야 할 제품" action="전체보기" />
            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20 }}>
              {firsts.slice(0, 2).map((p) => <Card key={p.id} style={{ width: 148, padding: 12, gap: 10 }}><ProdImg size={124} uri={p.imageUri} /><T numberOfLines={2} style={[tx(14, 20, 500), { minHeight: 40 }]}>{p.name}</T></Card>)}
            </View>
          </View>
        </ScrollView>

        <View style={{ position: 'absolute', inset: 0, zIndex: 20 }}>
          {active && !last ? <>
            <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: Math.max(0, active.y - pad), backgroundColor: 'rgba(23,23,25,0.62)' }} />
            <View style={{ position: 'absolute', left: 0, top: active.y - pad, width: Math.max(0, active.x - pad), height: active.height + pad * 2, backgroundColor: 'rgba(23,23,25,0.62)' }} />
            <View style={{ position: 'absolute', left: active.x + active.width + pad, right: 0, top: active.y - pad, height: active.height + pad * 2, backgroundColor: 'rgba(23,23,25,0.62)' }} />
            <View style={{ position: 'absolute', left: 0, right: 0, top: active.y + active.height + pad, bottom: 0, backgroundColor: 'rgba(23,23,25,0.62)' }} />
            <Pressable onPress={next} style={{ position: 'absolute', left: active.x - pad, top: active.y - pad, width: active.width + pad * 2, height: active.height + pad * 2, borderRadius: 22, borderWidth: 3, borderColor: COACH }} />
          </> : <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(23,23,25,0.62)' }} />}

          {!last && <Pressable onPress={() => finish(false)} style={{ position: 'absolute', top: 6, right: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 }}><T style={tx(15, 22, 500, '#FFFFFF')}>건너뛰기</T></Pressable>}

          {active && <View style={[{ position: 'absolute', left: 20, right: 20 }, last ? { bottom: 12 } : { top: Math.min(root.height - 250, active.y + active.height + 14) }]}>
            <View style={{ backgroundColor: C.white, borderRadius: 20, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 14 }}>
              <T style={tx(13, 18, 700, COACH)}>{index + 1} / {STEPS.length}</T>
              <T style={[tx(19, 27, 700), { marginTop: 4 }]}>{step.title}</T>
              <T style={[tx(14, 21, 400, C.neutral), { marginTop: 6 }]}>{step.body}</T>
              {last ? <View style={{ gap: 2, marginTop: 18 }}><DButton label="첫 제품 등록하기" icon="camera" onPress={() => finish(true)} /><Pressable onPress={() => finish(false)} style={{ alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 }}><T style={tx(15, 22, 500, C.alt)}>건너뛰기</T></Pressable></View> : <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>{STEPS.map((_, i) => <View key={i} style={{ height: 6, width: i === index ? 18 : 6, borderRadius: 999, backgroundColor: i === index ? COACH : C.lineNeutral }} />)}</View>
                <Pressable onPress={next} style={{ height: 40, paddingHorizontal: 20, borderRadius: 10, backgroundColor: COACH, justifyContent: 'center' }}><T style={tx(15, 22, 700, '#FFFFFF')}>다음</T></Pressable>
              </View>}
            </View>
          </View>}
        </View>
      </View>
    </Screen>
  );
}
