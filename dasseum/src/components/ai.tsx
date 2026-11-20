// AI 구매 분석 공통 아이콘 · 제목 (프로토타입 AiHead)
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { T } from '@/components/ui';
import { C, tx } from '@/theme/tokens';

export function Sparkle({ size = 20, color = C.logo }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 20 20"><Path d="M10 1.5c.7 4.6 3.1 7 7.5 7.7-4.4.7-6.8 3.1-7.5 7.8-.7-4.7-3.1-7.1-7.5-7.8C6.9 8.5 9.3 6.1 10 1.5Z" fill={color} /></Svg>;
}
export function MessageIcon() {
  return <Svg width={18} height={18} viewBox="0 0 18 18"><Path d="M3 3.25h12v8.5H8l-3.5 3v-3H3v-8.5Z" fill="none" stroke={C.neutral} strokeWidth={1.6} strokeLinejoin="round" /></Svg>;
}

export function AiHead({ title }: { title: string }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Sparkle /><T style={tx(15, 22, 700, C.logo)}>{title}</T></View>;
}
