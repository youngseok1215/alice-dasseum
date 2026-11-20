// 다씀 디자인 토큰 — 최신 프로토타입(다씀 프로토타입.html · proto/screens.jsx v5) 값 기준
import { Platform, type TextStyle } from 'react-native';

/** 네이티브 애니메이션 드라이버 사용 여부 (웹은 JS 애니메이션) */
export const ND = Platform.OS !== 'web';

export const C = {
  bg: '#F7FAF8',
  cream: '#F2EDE5',
  card: '#D9EFE9', // 민트 카드 · 민트 배지
  mint: '#7ED8C8', // Primary
  point: '#3EB6A6',
  logo: '#1E8C7E',
  white: '#FFFFFF',
  dark: '#1B1C1E', // 카메라 배경

  ink: '#171717', // --label-normal
  onPrimary: '#171719',
  neutral: 'rgba(46,47,51,0.88)', // --label-neutral
  alt: 'rgba(55,56,60,0.61)', // --label-alternative
  assist: 'rgba(55,56,60,0.28)', // --label-assistive
  imageIcon: 'rgba(55,56,60,0.45)',
  homeSub: 'rgba(46,47,51,0.74)',

  line: 'rgba(112,115,124,0.08)', // --line-normal-alternative
  lineNeutral: 'rgba(112,115,124,0.16)', // --line-normal-neutral
  fillNormal: 'rgba(112,115,124,0.08)',
  fillAlt: 'rgba(112,115,124,0.05)',
  disabledBg: '#F4F4F5',

  negative: '#FF4242', // --status-negative
  red40: '#E52222',
} as const;

export const BADGE = {
  warn: ['#FFF1E0', '#8F4500'],
  neg: ['#FFE8E8', '#B71C1C'],
  ok: ['#E3F7EA', '#0B6E30'],
  mint: [C.card, '#171719'],
  neutral: [C.fillNormal, C.neutral],
} as const;
export type BadgeTone = keyof typeof BADGE;

/** expo-font로 로드한 패밀리 이름 (RN은 커스텀 폰트 굵기를 패밀리로 구분) */
export const FONT: Record<number, string> = {
  400: 'Pretendard-Regular',
  500: 'Pretendard-Medium',
  600: 'Pretendard-SemiBold',
  700: 'Pretendard-Bold',
  800: 'Pretendard-ExtraBold',
};
export const BRAND_FONT = 'TheJamsil-ExtraBold';
export const BRAND_FONT_MEDIUM = 'TheJamsil-Medium';

/**
 * 프로토타입의 tx(size, lineHeight, weight, color)와 동일한 규칙.
 * letterSpacing: 20px 이상 -0.012em · 13px 이하 0.02em · 그 외 0.006em
 */
export function tx(size: number, lh: number, weight: 400 | 500 | 600 | 700 | 800, color: string = C.ink): TextStyle {
  const em = size >= 20 ? -0.012 : size <= 13 ? 0.02 : 0.006;
  return { fontSize: size, lineHeight: lh, fontFamily: FONT[weight], color, letterSpacing: +(size * em).toFixed(3) };
}

/** inset 0 0 0 1px 테두리를 RN에서 표현 (box-shadow inset 대체) */
export const hair = { borderWidth: 1, borderColor: C.line } as const;
