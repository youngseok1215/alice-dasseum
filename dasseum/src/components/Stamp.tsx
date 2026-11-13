// 체크 도장 (스플래시 A안 · 제품 등록 완료) — 원 + 체크 선 그리기 (react-native-reanimated, UI 스레드)
import Animated, { Easing, useAnimatedProps, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { C } from '@/theme/tokens';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** 명세의 이징 두 가지 */
export const EASE_OUT = Easing.bezier(0.2, 0, 0, 1); // cubic-bezier(0.2, 0, 0, 1)
export const EASE_IN_OUT = Easing.bezier(0.4, 0, 0.2, 1); // cubic-bezier(0.4, 0, 0.2, 1)
/** 체크 선 길이(약 74) — dashoffset 74 = 안 보임, 0 = 완성 */
export const CHECK_LEN = 74;

/** size: 원 지름(px) · dash: 체크 선 dashoffset(74 → 0) */
export function Stamp({ size, dash }: { size: number; dash: SharedValue<number> }) {
  const props = useAnimatedProps(() => ({ strokeDashoffset: dash.value }));
  return (
    <Svg width={size} height={size} viewBox="-56 -56 112 112">
      <Circle r={56} fill={C.point} />
      <AnimatedPath
        d="M-23.5 2 L-6.5 19 L25.5 -14"
        fill="none"
        stroke="#fff"
        strokeWidth={11}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${CHECK_LEN}`}
        animatedProps={props}
      />
    </Svg>
  );
}
