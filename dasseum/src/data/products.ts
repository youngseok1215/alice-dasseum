export type Category = '화장품' | '영양제' | '의약품' | '생활용품';

export interface Product {
  id: string;
  name: string;
  brand: string;
  cat: Category;
  opened: string | null;
  expires: string | null;
  dday: number | null;
  registered: string;
  memo?: string;
  reason?: string;
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

// 실제 사용자가 등록한 제품만 표시하며, 샘플 제품은 넣지 않습니다.
export const PRODUCTS: Record<string, Product> = {};
export const ALL_IDS: string[] = [];
export const FIRST_IDS: string[] = [];
export const CATEGORIES: Category[] = ['화장품', '영양제', '의약품', '생활용품'];

export type Verdict = 'same' | 'similar' | 'none';
export type CheckMode = 'search' | 'photo';

export function ddayOf(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value.replace(/\./g, '-') + 'T00:00:00');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (Number.isNaN(date.getTime())) return null;
  return Math.round((date.getTime() - today.getTime()) / 86_400_000);
}

/** 개봉 경과 문구 — 프로토타입 openedText */
export function openedText(p: Product) {
  if (!p.opened) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d = Math.round((today.getTime() - new Date(p.opened.replace(/\./g, '-') + 'T00:00:00').getTime()) / 86_400_000);
  if (d < 0) return null;
  const m = Math.floor(d / 30.44);
  return m >= 1 ? `개봉 ${m}개월째` : `개봉 ${d + 1}일째`;
}

/** 먼저 써야 할 이유 — 프로토타입 reasonOf (사용기한 60일 이내 우선, 아니면 개봉 경과) */
export function reasonOf(p: Product) {
  if (p.dday != null && p.dday <= 60) return p.dday < 0 ? '사용기한 지남' : p.dday === 0 ? '사용기한 오늘까지' : `사용기한 D-${p.dday}`;
  return p.reason && /^개봉/.test(p.reason) ? openedText(p) : null;
}

export const byDday = (a: Product, b: Product) => (a.dday ?? 1e9) - (b.dday ?? 1e9);

export const calculateDday = ddayOf;

export function recommendationReason(product: Product) {
  return reasonOf({ ...product, dday: ddayOf(product.expires) }) || undefined;
}

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

/** 서버에 저장된 제품을 포함한 실제 보유 목록과 제품명·브랜드·용량을 비교합니다. */
export function matchOwnedProducts(q: string, products: Product[]): { verdict: Verdict; items: string[] } {
  const query = compact(q);
  if (!query) return { verdict: 'none', items: [] };
  const queryBase = withoutDose(q);
  const queryDoses = doseTokens(q);
  const ranked = products.map((product) => {
    const target = compact(`${product.brand} ${product.name}`);
    const targetBase = withoutDose(`${product.brand} ${product.name}`);
    const targetDoses = doseTokens(product.name);
    const doseConflict = queryDoses.length > 0 && targetDoses.length > 0 && !queryDoses.some((dose) => targetDoses.includes(dose));
    const contains = target.includes(query) || query.includes(target);
    const baseContains = queryBase.length >= 3 && (targetBase.includes(queryBase) || queryBase.includes(targetBase));
    const score = Math.max(similarity(query, target), similarity(queryBase, targetBase));
    const verdict: Verdict = contains && !doseConflict ? 'same' : (baseContains || score >= 0.62) ? 'similar' : 'none';
    return { id: product.id, verdict, score: contains ? 1 : score };
  }).filter((item) => item.verdict !== 'none')
    .sort((a, b) => (a.verdict === b.verdict ? b.score - a.score : a.verdict === 'same' ? -1 : 1));
  const same = ranked.filter((item) => item.verdict === 'same');
  const selected = same.length ? same : ranked.filter((item) => item.verdict === 'similar');
  return { verdict: same.length ? 'same' : selected.length ? 'similar' : 'none', items: selected.slice(0, 3).map((item) => item.id) };
}

/** 사진으로 확인 목업 판정 (실제: 사진 업로드 API 응답) */
export type PhotoVerdict = Verdict;

export function matchQuery(q: string, mode: CheckMode, products: Product[] = Object.values(PRODUCTS), completed: string[] = [], photoVerdict: PhotoVerdict = 'same') {
  const live = products.filter((p) => !completed.includes(p.id));
  if (mode === 'photo') {
    if (photoVerdict === 'none' || !live.some((p) => p.id === 'vitd')) return { verdict: 'none' as const, items: [] as string[] };
    return { verdict: photoVerdict, items: ['vitd'] };
  }
  const s = (q || '').toLowerCase().replace(/\s/g, '');
  const addedSame = live.find((p) => p.name.toLowerCase().replace(/\s/g, '') === s);
  if (addedSame) return { verdict: 'same' as const, items: [addedSame.id] };
  // 목업 키워드 규칙 — 다 쓰거나 삭제한 제품은 결과에서 빠짐 (프로토타입 matchBase + completed 필터)
  const has = (id: string) => live.some((p) => p.id === id);
  if (/2000/.test(s) && /비타민d|vitamind|비타민디/.test(s) && has('vitd')) return { verdict: 'similar' as const, items: ['vitd'] };
  if (/비타민d|vitamind|비타민디/.test(s) && has('vitd')) return { verdict: 'same' as const, items: ['vitd'] };
  if (/65w|충전기|charger/.test(s) && has('charger')) return { verdict: 'similar' as const, items: ['charger'] };
  const addedSimilar = live.find((p) => {
    const n = p.name.toLowerCase().replace(/\s/g, '');
    return s.length >= 3 && (n.includes(s) || s.includes(n));
  });
  if (addedSimilar) return { verdict: 'similar' as const, items: [addedSimilar.id] };
  return { verdict: 'none' as const, items: [] as string[] };
}

export interface HoldRecord { name: string; match: '동일' | '유사'; date: string; isNew?: boolean }
export interface DoneRecord { name: string; cat: Category; date: string; isNew?: boolean }
export interface RecentCheck { q: string; date: string }

export const SEED = {
  query: '',
  recents: [] as RecentCheck[],
  holdList: [] as HoldRecord[],
  dones: [] as DoneRecord[],
  completed: [] as string[],
  openedOverrides: {} as Record<string, string>,
  registeredProducts: [] as Product[],
  notifyEnabled: true,
  cameraPermission: 'unknown' as 'unknown' | 'granted' | 'denied',
  readAlerts: [] as string[],
  alertsSeen: false,
  onboarded: false,
  /** 기본 제품(목업)을 수정한 내용 — 백엔드 연동 시 서버 값으로 대체 */
  productEdits: {} as Record<string, Partial<Product>>,
  /** 개발용 시뮬레이션 (프로토타입 오른쪽 패널) — 설정 > 개발자 옵션 */
  devPhotoVerdict: 'same' as PhotoVerdict,
  devRegisterFail: '' as '' | 'product' | 'expiry',
};
