// 목업 데이터 — 프로토타입 PRODUCTS / matchQuery 그대로 (기준일 2026-11-12)
// 백엔드 연동 시 이 파일을 API 응답으로 교체합니다. (docs/api-spec.md)

export type Category = '화장품' | '영양제' | '의약품' | '생활용품';

export interface Product {
  id: string;
  name: string;
  brand: string;
  cat: Category;
  opened: string | null; // 'YYYY.MM.DD' · 미개봉 null
  expires: string | null; // 표기 사용기한 · 미입력 null
  dday: number | null;
  registered: string;
  memo?: string;
  reason?: string; // 먼저 써야 할 이유
}

export const TODAY = '2026.11.12';
export const TODAY_SHORT = '11.12';

export const PRODUCTS: Record<string, Product> = {
  vitd: { id: 'vitd', name: '온데이 비타민D3 1000IU 90정', brand: '온데이', cat: '영양제', opened: '2026.09.03', expires: '2027.06.30', dday: 230, registered: '2026.09.03', memo: '주방 선반 보관' },
  toner: { id: 'toner', name: '약산성 진정 토너 300ml', brand: '라온스킨', cat: '화장품', opened: '2026.05.02', expires: '2026.11.19', dday: 7, registered: '2026.05.02', reason: '사용기한 D-7' },
  multi: { id: 'multi', name: '멀티비타민 60정', brand: '하루웰', cat: '영양제', opened: '2026.08.01', expires: '2026.12.05', dday: 23, registered: '2026.07.28', reason: '사용기한 D-23' },
  sun: { id: 'sun', name: '데일리 선크림 SPF50+ 50ml', brand: '선데이즈', cat: '화장품', opened: '2026.09.10', expires: '2027.03.10', dday: 118, registered: '2026.09.10', reason: '개봉 2개월째' },
  eye: { id: 'eye', name: '인공눈물 일회용 30개입', brand: '맑은눈', cat: '의약품', opened: null, expires: '2026.11.10', dday: -2, registered: '2026.06.14' },
  shampoo: { id: 'shampoo', name: '퍼퓸 샴푸 1L', brand: '배스데이', cat: '생활용품', opened: '2026.10.20', expires: null, dday: null, registered: '2026.10.20' },
};

export const ALL_IDS = ['vitd', 'toner', 'multi', 'sun', 'eye', 'shampoo'];
export const FIRST_IDS = ['toner', 'multi', 'sun']; // 먼저 써야 할 제품 (PRD F6-02 정렬 결과)
export const URGENT_IDS = ['eye', 'toner']; // 홈 · 사용기한 임박
export const CATEGORIES: Category[] = ['화장품', '영양제', '의약품', '생활용품'];

export type Verdict = 'same' | 'similar' | 'none';
export type CheckMode = 'search' | 'photo';

/** 중복 확인 판정 (목업 규칙) — 실제로는 AI/API 응답으로 대체 */
export function matchQuery(q: string, mode: CheckMode): { verdict: Verdict; items: string[] } {
  if (mode === 'photo') return { verdict: 'same', items: ['vitd'] };
  const s = (q || '').toLowerCase().replace(/\s/g, '');
  if (/2000/.test(s) && /비타민d|vitamind/.test(s)) return { verdict: 'similar', items: ['vitd'] };
  if (/비타민d|vitamind|비타민디/.test(s)) return { verdict: 'same', items: ['vitd'] };
  return { verdict: 'none', items: [] };
}

export interface HoldRecord { name: string; match: '동일' | '유사'; date: string; isNew?: boolean }
export interface DoneRecord { name: string; cat: Category; date: string; isNew?: boolean }
export interface RecentCheck { q: string; date: string }

export const SEED = {
  query: '',
  recents: [
    { q: '데일리 선크림 SPF50+', date: '11.08' },
    { q: '약산성 진정 토너', date: '11.03' },
  ] as RecentCheck[],
  holdList: [
    { name: '데일리 선크림 SPF50+ 50ml', match: '동일', date: '2026.11.08' },
    { name: '약산성 진정 토너 300ml', match: '동일', date: '2026.11.03' },
  ] as HoldRecord[],
  dones: [
    { name: '약산성 클렌징폼 150ml', cat: '화장품', date: '2026.11.10' },
    { name: '핸드워시 리필 500ml', cat: '생활용품', date: '2026.11.05' },
    { name: '립밤 4.5g', cat: '화장품', date: '2026.11.01' },
  ] as DoneRecord[],
  completed: [] as string[],
  openedOverrides: {} as Record<string, string>,
};
