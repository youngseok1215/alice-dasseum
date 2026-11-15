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
  imageUri?: string;
}

function dotDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

export const TODAY = dotDate(new Date());
export const TODAY_SHORT = TODAY.slice(5);

export function isCurrentMonth(value: string) {
  return value.replace(/-/g, '.').startsWith(TODAY.slice(0, 7));
}

export function calculateDday(value?: string | null) {
  if (!value) return null;
  const parts = value.replace(/\./g, '-').split('-').map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;
  const expiry = new Date(parts[0], parts[1] - 1, parts[2]);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((expiry.getTime() - today.getTime()) / 86_400_000);
}

function openedMonths(value?: string | null) {
  if (!value) return 0;
  const [year, month, day] = value.replace(/\./g, '-').split('-').map(Number);
  const now = new Date();
  let months = (now.getFullYear() - year) * 12 + now.getMonth() + 1 - month;
  if (now.getDate() < day) months -= 1;
  return Math.max(0, months);
}

export function recommendationReason(product: Product) {
  const dday = calculateDday(product.expires);
  if (dday === null || dday < 0) return undefined;
  if (dday <= 60) return dday === 0 ? '사용기한 오늘' : `사용기한 D-${dday}`;
  const months = openedMonths(product.opened);
  return months >= 2 ? `개봉 ${months}개월째` : `사용기한 D-${dday}`;
}

export const PRODUCTS: Record<string, Product> = {
  vitd: { id: 'vitd', name: '온데이 비타민D3 1000IU 90정', brand: '온데이', cat: '영양제', opened: '2026.09.03', expires: '2027.06.30', dday: calculateDday('2027.06.30'), registered: '2026.09.03', memo: '주방 선반 보관' },
  toner: { id: 'toner', name: '약산성 진정 토너 300ml', brand: '라온스킨', cat: '화장품', opened: '2026.05.02', expires: '2026.11.19', dday: calculateDday('2026.11.19'), registered: '2026.05.02' },
  multi: { id: 'multi', name: '멀티비타민 60정', brand: '하루웰', cat: '영양제', opened: '2026.08.01', expires: '2026.12.05', dday: calculateDday('2026.12.05'), registered: '2026.07.28' },
  sun: { id: 'sun', name: '데일리 선크림 SPF50+ 50ml', brand: '선데이즈', cat: '화장품', opened: '2026.09.10', expires: '2027.03.10', dday: calculateDday('2027.03.10'), registered: '2026.09.10' },
  eye: { id: 'eye', name: '인공눈물 일회용 30개입', brand: '맑은눈', cat: '의약품', opened: null, expires: '2026.11.10', dday: calculateDday('2026.11.10'), registered: '2026.06.14' },
  shampoo: { id: 'shampoo', name: '퍼퓸 샴푸 1L', brand: '배스데이', cat: '생활용품', opened: '2026.10.20', expires: null, dday: null, registered: '2026.10.20' },
};

export const ALL_IDS = ['vitd', 'toner', 'multi', 'sun', 'eye', 'shampoo'];
export const CATEGORIES: Category[] = ['화장품', '영양제', '의약품', '생활용품'];

export type Verdict = 'same' | 'similar' | 'none';
export type CheckMode = 'search' | 'photo';

function compact(value: string) {
  return value.normalize('NFKC').toLowerCase().replace(/[^0-9a-z가-힣]/g, '');
}

function doseTokens(value: string): string[] {
  return compact(value).match(/\d+(?:\.\d+)?(?:mg|g|ml|iu|정|캡슐|개|매|포)/g) ?? [];
}

function withoutDose(value: string) {
  return compact(value).replace(/\d+(?:\.\d+)?(?:mg|g|ml|iu|정|캡슐|개|매|포)/g, '');
}

function bigrams(value: string) {
  if (value.length < 2) return value ? [value] : [];
  return Array.from({ length: value.length - 1 }, (_, index) => value.slice(index, index + 2));
}

function similarity(a: string, b: string) {
  const left = bigrams(a);
  const right = bigrams(b);
  if (!left.length || !right.length) return 0;
  const remaining = [...right];
  let shared = 0;
  for (const token of left) {
    const index = remaining.indexOf(token);
    if (index < 0) continue;
    shared += 1;
    remaining.splice(index, 1);
  }
  return (2 * shared) / (left.length + right.length);
}

/** 현재 보유 제품 전체(서버 DB 제품 포함)를 제품명·브랜드·용량으로 비교합니다. */
export function matchOwnedProducts(q: string, products: Product[]): { verdict: Verdict; items: string[] } {
  const query = compact(q);
  if (!query) return { verdict: 'none', items: [] };
  const queryBase = withoutDose(q);
  const queryDoses = doseTokens(q);

  const ranked = products.map((product) => {
    const target = compact(`${product.brand} ${product.name}`);
    const targetBase = withoutDose(`${product.brand} ${product.name}`);
    const targetDoses = doseTokens(product.name);
    const doseConflict = queryDoses.length > 0 && targetDoses.length > 0 &&
      !queryDoses.some((dose) => targetDoses.includes(dose));
    const contains = target.includes(query) || query.includes(target);
    const baseContains = queryBase.length >= 3 && (targetBase.includes(queryBase) || queryBase.includes(targetBase));
    const score = Math.max(similarity(query, target), similarity(queryBase, targetBase));
    const verdict: Verdict = contains && !doseConflict
      ? 'same'
      : (baseContains || score >= 0.62) ? 'similar' : 'none';
    return { id: product.id, verdict, score: contains ? 1 : score };
  }).filter((item) => item.verdict !== 'none')
    .sort((a, b) => (a.verdict === b.verdict ? b.score - a.score : a.verdict === 'same' ? -1 : 1));

  const same = ranked.filter((item) => item.verdict === 'same');
  const selected = same.length ? same : ranked.filter((item) => item.verdict === 'similar');
  return { verdict: same.length ? 'same' : selected.length ? 'similar' : 'none', items: selected.slice(0, 3).map((item) => item.id) };
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
  productOverrides: {} as Record<string, Product>,
  removedProductIds: [] as string[],
};
