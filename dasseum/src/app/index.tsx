// 0. 스플래시 — 명세 3항 "반드시 이대로"
// 점 → 체크 원 확장(0–0.4s) → 체크 그리기(0.4–0.8s) → 마침표로 축소·이동(0.8–1.4s)
// 로고 페이드(0.9–1.4s) → 슬로건(1.28–1.6s) → 2.0s에 홈으로 replace.
// 동작 줄이기가 켜져 있으면 완성 상태만 보여 줍니다.
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Text as SvgText } from 'react-native-svg';
import { nav, useTimeout } from '@/components/shell';
import { CHECK_LEN, EASE_IN_OUT, EASE_OUT, Stamp } from '@/components/Stamp';
import { BRAND_FONT, BRAND_FONT_MEDIUM, C } from '@/theme/tokens';

const VB_W = 375; // 기준 캔버스 375×740
const VB_H = 740;
const START = { x: 187.5, y: 350 };
const END = { x: 235, y: 357 }; // '다씀'의 마침표 자리

export default function Splash() {
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);

  const scale = useSharedValue(0.18);
  const move = useSharedValue(reduce ? 1 : 0);
  const dash = useSharedValue(reduce ? 0 : CHECK_LEN);
  const logo = useSharedValue(reduce ? 1 : 0);
  const slogan = useSharedValue(reduce ? 1 : 0);

  useEffect(() => {
    if (reduce) return;
    scale.value = withSequence(
      withTiming(1, { duration: 400, easing: EASE_OUT }),
      withDelay(400, withTiming(0.18, { duration: 600, easing: EASE_IN_OUT })),
    );
    dash.value = withDelay(400, withTiming(0, { duration: 400, easing: EASE_OUT }));
    move.value = withDelay(800, withTiming(1, { duration: 600, easing: EASE_IN_OUT }));
    logo.value = withDelay(900, withTiming(1, { duration: 500, easing: EASE_OUT }));
    slogan.value = withDelay(1280, withTiming(1, { duration: 320, easing: EASE_OUT }));
  }, [reduce, scale, dash, move, logo, slogan]);

  useTimeout(() => nav.reset('/home'), 2000);

  // viewBox(375×740, xMidYMid meet) 좌표 → 화면 좌표
  const k = box ? Math.min(box.w / VB_W, box.h / VB_H) : 1;
  const ox = box ? (box.w - VB_W * k) / 2 : 0;
  const oy = box ? (box.h - VB_H * k) / 2 : 0;
  const d = 112 * k;

  const stampStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: move.value * (END.x - START.x) * k },
      { translateY: move.value * (END.y - START.y) * k },
      { scale: scale.value },
    ],
  }));
  const logoStyle = useAnimatedStyle(() => ({ opacity: logo.value, transform: [{ translateX: (1 - logo.value) * -8 * k }] }));
  const sloganStyle = useAnimatedStyle(() => ({ opacity: slogan.value, transform: [{ translateY: (1 - slogan.value) * 4 * k }] }));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <StatusBar style="dark" />
      <View
        style={{ flex: 1 }}
        onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        accessible
        accessibilityLabel="다씀. 있는 걸 먼저, 끝까지 다 쓰는 습관"
      >
        {box && (
          <>
            <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: box.w, height: box.h }, logoStyle]}>
              <Svg width={box.w} height={box.h} viewBox={`0 0 ${VB_W} ${VB_H}`}>
                <SvgText x={178} y={366} textAnchor="middle" fontFamily={BRAND_FONT} fontSize={46} letterSpacing={-1.8} fill={C.logo}>다씀</SvgText>
              </Svg>
            </Animated.View>
            <Animated.View style={[{ position: 'absolute', left: ox + START.x * k - d / 2, top: oy + START.y * k - d / 2, width: d, height: d }, stampStyle]}>
              <Stamp size={d} dash={dash} />
            </Animated.View>
            <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: box.w, height: box.h }, sloganStyle]}>
              <Svg width={box.w} height={box.h} viewBox={`0 0 ${VB_W} ${VB_H}`}>
                <SvgText x={187.5} y={406} textAnchor="middle" fontFamily={BRAND_FONT_MEDIUM} fontSize={14} fill="rgba(55,56,60,0.61)">있는 걸 먼저, 끝까지 다 쓰는 습관</SvgText>
              </Svg>
            </Animated.View>
          </>
        )}
      </View>
    </View>
  );
}
