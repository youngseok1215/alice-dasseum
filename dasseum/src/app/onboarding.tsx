import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, View, type LayoutRectangle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { BottomNav, Screen } from '@/components/shell';
import { Card, DButton, Icon, IconBtn, Mascot, SectionHead, T } from '@/components/ui';
import { useApp } from '@/store/AppStore';
import { BRAND_FONT, C, tx } from '@/theme/tokens';

const COACH = '#1E8C7E';
const STEPS = [
  { key: 'reg', title: '가진 제품을 등록해요', body: '사진을 찍으면 AI가 제품 정보를 읽고, 사진 없이 직접 입력할 수도 있어요. 잘못 읽은 정보는 직접 고칠 수 있어요.' },
  { key: 'check', title: '사기 전에 있는지 확인할 수 있어요', body: '‘구매 전 확인’에서 사려는 제품을 검색하거나 찍으면 내 물품에서 같은 제품, 비슷한 제품을 찾아줘요.' },
  { key: 'first', title: '있는 것부터 끝까지 써요', body: '개봉일과 사용기한을 보고 먼저 쓸 제품을 알려줘요. 다 쓰면 ‘다씀’으로 기록해요.' },
] as const;

type TargetKey = (typeof STEPS)[number]['key'];
type Rect = LayoutRectangle;

function roundedCutoutPath(width: number, height: number, rect: Rect, pad: number, radius: number) {
  const x = rect.x - pad;
  const y = rect.y - pad;
  const w = rect.width + pad * 2;
  const h = rect.height + pad * 2;
  const r = Math.min(radius, w / 2, h / 2);
  return [
    `M0 0H${width}V${height}H0Z`,
    `M${x + r} ${y}H${x + w - r}`,
    `A${r} ${r} 0 0 1 ${x + w} ${y + r}`,
    `V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}`,
    `H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}`,
    `V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`,
  ].join(' ');
}

export default function Onboarding() {
  const [index, setIndex] = useState(0);
  const [rects, setRects] = useState<Partial<Record<TargetKey, Rect>>>({});
  const [root, setRoot] = useState({ width: 0, height: 0 });
  const [tipHeight, setTipHeight] = useState(0);
  const { finishOnboarding, user } = useApp();
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
    if (!user) router.replace({ pathname: '/profile', params: register ? { next: 'register' } : {} });
    else router.replace(register ? '/register-method' : '/home');
  };
  const next = () => last ? finish(true) : setIndex((v) => v + 1);
  const active = rects[step.key];
  const pad = 6;

  return (
    <Screen>
      <View ref={rootRef} collapsable={false} onLayout={(e) => { setRoot(e.nativeEvent.layout); setTimeout(measure, 0); }} style={{ flex: 1, overflow: 'hidden' }}>
        <ScrollView pointerEvents="none" scrollEnabled={false} showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
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
            <View ref={regRef} collapsable={false} style={{ flex: 1 }}><Card style={{ height: 112, padding: 16, justifyContent: 'space-between' }}><Icon name="camera" size={24} /><View><T style={tx(16, 24, 800)}>제품 등록</T><T style={tx(13, 18, 400, C.alt)}>사진 또는 직접 입력</T></View></Card></View>
            <View ref={checkRef} collapsable={false} style={{ flex: 1 }}><Card tone="mint" style={{ height: 112, padding: 16, justifyContent: 'space-between' }}><Icon name="search" size={24} /><View><T style={tx(16, 24, 800)}>구매 전 확인</T><T style={tx(13, 18, 400, C.neutral)}>사기 전에 먼저 확인해요</T></View></Card></View>
          </View>
          <View ref={firstRef} collapsable={false}>
            <SectionHead title="먼저 써야 할 제품" action="전체보기" />
            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20 }}>
              <Card style={{ width: 196, padding: 16 }}>
                <T style={tx(14, 20, 500, C.alt)}>등록한 제품이 여기에 표시돼요</T>
              </Card>
            </View>
          </View>
        </ScrollView>
        <View pointerEvents="none"><BottomNav active="home" /></View>

        <View style={{ position: 'absolute', inset: 0, zIndex: 20 }}>
          {active && !last ? <>
            <Svg pointerEvents="none" width={root.width} height={root.height} style={{ position: 'absolute', left: 0, top: 0 }}>
              <Path d={roundedCutoutPath(root.width, root.height, active, pad, 22)} fill="rgba(23,23,25,0.62)" fillRule="evenodd" />
            </Svg>
            <Pressable onPress={next} style={{ position: 'absolute', left: active.x - pad, top: active.y - pad, width: active.width + pad * 2, height: active.height + pad * 2, borderRadius: 22, borderWidth: 3, borderColor: COACH }} />
          </> : <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(23,23,25,0.62)' }} />}

          {!last && <Pressable onPress={() => finish(false)} style={{ position: 'absolute', top: 6, right: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 }}><T style={tx(15, 22, 500, '#FFFFFF')}>건너뛰기</T></Pressable>}

          {active && <View onLayout={(e) => setTipHeight(e.nativeEvent.layout.height)} style={[{ position: 'absolute', left: 20, right: 20 }, last ? { top: Math.max(12, (root.height - tipHeight) / 2) } : { top: Math.min(root.height - 250, active.y + active.height + 14) }]}>
            <View style={{ backgroundColor: C.white, borderRadius: 20, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 14 }}>
              <T style={tx(13, 18, 700, COACH)}>{index + 1} / {STEPS.length}</T>
              <T style={[tx(19, 27, 700), { marginTop: 4 }]}>{step.title}</T>
              <T style={[tx(14, 21, 400, C.neutral), { marginTop: 6 }]}>{step.body}</T>
              {last ? <View style={{ gap: 2, marginTop: 18 }}><DButton label="첫 제품 등록하기" onPress={() => finish(true)} /><Pressable onPress={() => finish(false)} style={{ alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 }}><T style={tx(15, 22, 500, C.alt)}>건너뛰기</T></Pressable></View> : <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
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
