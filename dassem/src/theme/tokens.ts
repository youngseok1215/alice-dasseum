// 다씀 디자인 토큰 — 디자인 시안(2a)에서 추출한 값. 화면 코드에서 숫자/색을 직접 쓰지 말고 이 파일만 참조하세요.
import { Platform, TextStyle, ViewStyle } from 'react-native';

export const colors = {
  // 대표 팔레트
  primary: '#7ED8C8',
  primaryPressed: '#67CABB',
  sub: '#D9EFE9',
  subPressed: '#CBE8E1',
  subStrong: '#BDE5DB',
  deep: '#3EB6A6',
  background: '#F7FAF8',
  surface: '#FFFFFF',
  cream: '#F2EDE5',
  text: '#171719',

  // 보조(중립)
  textSecondary: '#4E6361',  // 설명 문구
  textTertiary: '#6B7F7D',   // 캡션, 플레이스홀더 라벨
  textDisabled: '#9AABA9',   // 비활성 탭, 화살표
  border: '#E3ECEA',         // 카드 테두리
  divider: '#EEF3F2',        // 목록 구분선
  surfaceMuted: '#F1F5F4',   // 칩/태그 기본 배경
  imageBg: '#F4F8F7',        // 제품 사진 자리
  primaryDisabled: '#B8DFDA',

  // 상태
  dangerBg: '#FDECEC', danger: '#C62F35',   // 유통기한 D-30 이내, '이미 있어요'
  cautionBg: '#FFF2DE', caution: '#A35F00', // 유통기한 D-90 이내
  neutralTagBg: '#F1F5F4', neutralTag: '#4E6361',

  // 순위 배지 (사용 순서)
  rank: ['#218C82', '#36B7AB', '#6FCBC2', '#B8C6C4'],

  toastBg: '#263B3A',
  onPrimary: '#171719',
} as const;

export const spacing = { xxs: 2, xs: 4, sm: 6, md: 8, lg: 10, xl: 12, '2xl': 14, '3xl': 16, '4xl': 18, '5xl': 20, '6xl': 24, '7xl': 28 } as const;

// 화면 좌우 여백 16, 카드 내부 14~20, 요소 간 간격 8~14
export const layout = { screenPaddingH: 20, sectionGap: 16, headerHeight: 52, tabBarHeight: 76, minTouch: 44 } as const;

export const radius = { tag: 6, badge: 12, chip: 19, input: 18, button: 18, card: 20, banner: 24, thumb: 14, pill: 999 } as const;

export const fonts = {
  regular: 'Pretendard-Regular',
  medium: 'Pretendard-Medium',
  semibold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
  extrabold: 'Pretendard-ExtraBold',
} as const;

// letterSpacing: 디자인은 -0.01em 기본, 큰 제목 -0.02~-0.03em → RN은 px 단위라 fontSize * em으로 환산
const t = (size: number, family: string, lh?: number, em = -0.01): TextStyle => ({
  fontSize: size, fontFamily: family, lineHeight: lh ?? Math.round(size * 1.4), letterSpacing: size * em, color: colors.text,
});

export const type = {
  splashLogo: t(36, fonts.extrabold, 44, -0.03),
  logo: t(26, fonts.extrabold, 32, -0.03),
  screenTitle: t(24, fonts.extrabold, 32),
  bannerTitle: t(21, fonts.extrabold, 28, -0.02),   // 홈 배너
  resultTitle: t(20, fonts.extrabold, 27),          // 검색/결과 배너
  sectionTitle: t(19, fonts.extrabold, 26),         // '최근 AI 확인 결과'
  headerTitle: t(18, fonts.extrabold, 24),          // 상단 바 제목
  tileTitle: t(18, fonts.extrabold, 24),            // 홈 큰 버튼
  cardTitle: t(17, fonts.extrabold, 23),
  button: t(17, fonts.extrabold, 22),
  body: t(16, fonts.semibold, 22),                  // 입력값, 리스트 항목
  itemName: t(15, fonts.bold, 21),
  bodySm: t(14, fonts.regular, 21),                 // 설명
  label: t(14, fonts.regular, 20),
  caption: t(13, fonts.regular, 19),
  badge: t(13, fonts.bold, 18),
  tag: t(12, fonts.semibold, 16),
  tabLabel: t(12, fonts.bold, 16),
} as const;

export const shadow = {
  card: Platform.select<ViewStyle>({
    ios: { shadowColor: '#263B3A', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 } },
    android: { elevation: 2 },
    default: { boxShadow: '0 4px 14px rgba(38,59,58,0.05)' } as ViewStyle,
  }),
  toast: Platform.select<ViewStyle>({
    ios: { shadowColor: '#263B3A', shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: 0, height: 8 } },
    android: { elevation: 8 },
    default: { boxShadow: '0 8px 24px rgba(38,59,58,0.25)' } as ViewStyle,
  }),
  // 로딩 캐릭터 발밑 흐린 타원. 납작한 막대가 아니라 퍼지는 그림자 (boxShadow는 RN 0.76+ 모든 플랫폼 지원)
  splash: { backgroundColor: 'rgba(38,59,58,0.9)', boxShadow: '0 0 12px 8px rgba(38,59,58,0.9)' } as ViewStyle,
} as const;

export const motion = {
  splashDuration: 1800,   // 로딩 → 홈 자동 이동(ms), 탭하면 즉시 이동
  bobDuration: 1800,      // 캐릭터 위아래 흔들림 1회(ms), translateY 0 → -12, rotate -1.5° ↔ 1.5°
  dotDuration: 1200,      // 로딩 점 3개, 0.16s 간격
  scanDuration: 1600,     // AI 인식 스캔 시간(ms)
  scanLoop: 1400,         // 스캔 라인 왕복(ms), top 12% ↔ 84%
  toastDuration: 2600,
  enterDuration: 600,     // 캐릭터 등장: opacity 0→1, translateY 10→0
} as const;

// 유통기한 상태 → 태그 색
export function statusTone(isExpiry: boolean, daysLeft: number) {
  if (isExpiry && daysLeft <= 30) return { bg: colors.dangerBg, fg: colors.danger };
  if (isExpiry && daysLeft <= 90) return { bg: colors.cautionBg, fg: colors.caution };
  return { bg: colors.neutralTagBg, fg: colors.neutralTag };
}
