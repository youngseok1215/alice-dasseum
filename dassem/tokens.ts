// 다씀 디자인 토큰 (Soft Mint & Cream + Wanted Design System 기반)
// RN StyleSheet에서 그대로 사용할 수 있는 숫자/문자열 값입니다.

export const palette = {
  bg: '#F7FAF8',          // 화면 기본 배경
  cream: '#F2EDE5',       // 보조 배경, 요약 카드, 이미지 플레이스홀더
  mintCard: '#D9EFE9',    // 강조 카드, 선택 배지 배경 (화면당 1~2개)
  mint: '#7ED8C8',        // Primary 버튼 배경, 선택 칩
  point: '#3EB6A6',       // 눌림 상태, 진행 바, 장식. 텍스트 사용 금지(대비 2.5:1)
  logo: '#1E8C7E',        // 로고 '다씀.' 전용 (팔레트 외 · 확인 필요)
  white: '#FFFFFF',
  dark: '#1B1C1E',        // 카메라 화면 배경
} as const;

// Wanted DS Label/Line/Fill 값
export const neutral = {
  labelNormal: '#171719',
  labelNeutral: 'rgba(46,47,51,0.88)',
  labelAlternative: 'rgba(55,56,60,0.61)',
  labelAssistive: 'rgba(55,56,60,0.28)',
  lineNormal: 'rgba(112,115,124,0.22)',
  lineNeutral: 'rgba(112,115,124,0.16)',
  lineAlternative: 'rgba(112,115,124,0.08)',
  fillNormal: 'rgba(112,115,124,0.08)',
  fillAlternative: 'rgba(112,115,124,0.05)',
  imageIcon: 'rgba(55,56,60,0.45)',
} as const;

// 상태 배지 [배경, 글자]
export const status = {
  warn: { bg: '#FFF1E0', fg: '#8F4500' },     // 임박(D-30 이내), 동일 제품 있음
  neg: { bg: '#FFE8E8', fg: '#B71C1C' },      // 기한 지남, 오늘까지
  ok: { bg: '#E3F7EA', fg: '#0B6E30' },       // 보유 제품 없음
  mint: { bg: '#D9EFE9', fg: '#171719' },     // 유사 제품 있음, 추천 사유, 카테고리
  neutral: { bg: 'rgba(112,115,124,0.08)', fg: 'rgba(46,47,51,0.88)' }, // 여유, 기한 미입력
  negativeDot: '#FF4242',
} as const;

export const colors = {
  ...palette,
  ...neutral,
  primary: palette.mint,
  primaryPressed: palette.point,
  onPrimary: neutral.labelNormal,
} as const;

export const fonts = {
  // expo-font로 로드할 이름 (패키지명은 프로젝트 설정에 맞춰 변경)
  regular: 'Pretendard-Medium',   // 500
  semibold: 'Pretendard-SemiBold',// 600
  bold: 'Pretendard-Bold',        // 700
  extrabold: 'Pretendard-ExtraBold', // 800
  brand: 'WantedSans-ExtraBold',  // 로고타입
} as const;

// [fontSize, lineHeight, letterSpacing(px)] — 웹 em 값을 px로 환산
export const type = {
  display: { fontSize: 40, lineHeight: 48, letterSpacing: -1.6 },   // 스플래시 로고
  title1: { fontSize: 24, lineHeight: 32, letterSpacing: -0.29 },   // 화면 제목
  title2: { fontSize: 22, lineHeight: 30, letterSpacing: -0.26 },   // 홈 인사, 상세 제품명
  title3: { fontSize: 20, lineHeight: 28, letterSpacing: -0.24 },
  heading: { fontSize: 18, lineHeight: 26, letterSpacing: 0.1 },    // 상단 바
  section: { fontSize: 17, lineHeight: 24, letterSpacing: 0.1 },    // 섹션 제목
  body1: { fontSize: 16, lineHeight: 24, letterSpacing: 0.1 },
  body2: { fontSize: 15, lineHeight: 22, letterSpacing: 0.09 },
  label: { fontSize: 14, lineHeight: 20, letterSpacing: 0.08 },
  caption: { fontSize: 13, lineHeight: 18, letterSpacing: 0.26 },
  badge: { fontSize: 12, lineHeight: 16, letterSpacing: 0.24 },
  tab: { fontSize: 11, lineHeight: 14, letterSpacing: 0.33 },
} as const;

export const space = { 2: 2, 4: 4, 6: 6, 8: 8, 10: 10, 12: 12, 14: 14, 16: 16, 20: 20, 24: 24, 28: 28, 32: 32, 40: 40 } as const;
export const layout = { screenX: 20, sectionGap: 28, topBarHeight: 56, tabBarHeight: 56, buttonLg: 48, buttonMd: 40, input: 48, badge: 22, chip: 36 } as const;

export const radius = { xs: 6, sm: 8, md: 10, lg: 12, xl: 14, card: 16, pill: 999 } as const;

// RN 그림자. 헤어라인은 borderWidth: StyleSheet.hairlineWidth + lineAlternative 색으로 대체
export const shadow = {
  field: { shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  card: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  knob: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 0 }, elevation: 2 },
} as const;

export const motion = {
  easing: [0.2, 0, 0, 1] as const,  // Wanted standard ease (Easing.bezier)
  fast: 150,      // 눌림 오버레이
  normal: 250,    // 화면 전환 페이드
  splash: 1800,   // 스플래시 표시 시간
  analyzing: 1700,// AI 확인 중 목업 대기
  toast: 2000,
} as const;

// 눌림 상태: Label/Normal 오버레이 불투명도
export const interaction = { hover: 0.05, focus: 0.08, pressed: 0.12 } as const;

export const mascotSize = { splash: 180, home: 140, analyzing: 160, held: 180, done: 220 } as const;
