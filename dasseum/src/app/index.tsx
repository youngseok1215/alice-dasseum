// 0. 스플래시 — 점 → 체크 원 확장 → 마침표로 축소 (A안, 1.6초) → 2초 후 홈
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Text as SvgText } from 'react-native-svg';
import { StatusBar } from 'expo-status-bar';
import { nav, useTimeout } from '@/components/shell';
import { Stamp } from '@/components/Stamp';
import { BRAND_FONT, BRAND_FONT_MEDIUM, C, ND } from '@/theme/tokens';

const E1 = Easing.bezier(0.2, 0, 0, 1);
const E2 = Easing.bezier(0.4, 0, 0.2, 1);
const VB_W = 375;
const VB_H = 740;

export default function Splash() {
  const insets = useSafeAreaInsets();
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const scale = useRef(new Animated.Value(0.18)).current;
  const move = useRef(new Animated.Value(0)).current;
  const dash = useRef(new Animated.Value(74)).current;
  const logo = useRef(new Animated.Value(0)).current;
  const slogan = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const n = ND;
    Animated.parallel([
      Animated.sequence([
        Animated.timing(scale, { toValue: 1, duration: 400, easing: E1, useNativeDriver: n }),
        Animated.delay(400),
        Animated.timing(scale, { toValue: 0.18, duration: 600, easing: E2, useNativeDriver: n }),
      ]),
      Animated.sequence([Animated.delay(800), Animated.timing(move, { toValue: 1, duration: 600, easing: E2, useNativeDriver: n })]),
      Animated.sequence([Animated.delay(400), Animated.timing(dash, { toValue: 0, duration: 400, easing: E1, useNativeDriver: false })]),
      Animated.sequence([Animated.delay(896), Animated.timing(logo, { toValue: 1, duration: 504, easing: E1, useNativeDriver: n })]),
      Animated.sequence([Animated.delay(1280), Animated.timing(slogan, { toValue: 1, duration: 320, easing: E1, useNativeDriver: n })]),
    ]).start();
  }, [scale, move, dash, logo, slogan]);

  useTimeout(() => nav.reset('/home'), 2000);

  // SVG viewBox(375×740, xMidYMid meet) 좌표 → 화면 좌표
  const k = box ? Math.min(box.w / VB_W, box.h / VB_H) : 1;
  const ox = box ? (box.w - VB_W * k) / 2 : 0;
  const oy = box ? (box.h - VB_H * k) / 2 : 0;
  const d = 112 * k;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <StatusBar style="dark" />
      <View style={{ flex: 1 }} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        accessible accessibilityLabel="다씀. 있는 걸 먼저, 끝까지 다 쓰는 습관">
        {box && (
          <>
            <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: box.w, height: box.h, opacity: logo, transform: [{ translateX: logo.interpolate({ inputRange: [0, 1], outputRange: [-8 * k, 0] }) }] }}>
              <Svg width={box.w} height={box.h} viewBox={`0 0 ${VB_W} ${VB_H}`}>
                <SvgText x={178} y={366} textAnchor="middle" fontFamily={BRAND_FONT} fontSize={46} letterSpacing={-1.8} fill={C.logo}>다씀</SvgText>
              </Svg>
            </Animated.View>
            <Animated.View style={{ position: 'absolute', left: ox + 187.5 * k - d / 2, top: oy + 350 * k - d / 2, width: d, height: d,
              transform: [
                { translateX: move.interpolate({ inputRange: [0, 1], outputRange: [0, (235 - 187.5) * k] }) },
                { translateY: move.interpolate({ inputRange: [0, 1], outputRange: [0, (357 - 350) * k] }) },
                { scale },
              ] }}>
              <Stamp size={d} dash={dash} />
            </Animated.View>
            <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: box.w, height: box.h, opacity: slogan, transform: [{ translateY: slogan.interpolate({ inputRange: [0, 1], outputRange: [4 * k, 0] }) }] }}>
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
