// 체크 도장 (스플래시 A안 · 제품 등록 완료) — 원 확대 + 체크 선 그리기
import React from 'react';
import { Animated, Platform } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { C } from '@/theme/tokens';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** size: 원 지름(px) · dash: 0(완성)~74(안 보임) 애니메이션 값 */
export function Stamp({ size, dash }: { size: number; dash: Animated.Value | Animated.AnimatedInterpolation<number> }) {
  return (
    <Svg width={size} height={size} viewBox="-56 -56 112 112">
      <Circle r={56} fill={C.point} />
      {Platform.OS === 'web'
        ? <Path d="M-23.5 2 L-6.5 19 L25.5 -14" fill="none" stroke="#fff" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
        : <AnimatedPath d="M-23.5 2 L-6.5 19 L25.5 -14" fill="none" stroke="#fff" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="74" strokeDashoffset={dash as unknown as number} />}
    </Svg>
  );
}
