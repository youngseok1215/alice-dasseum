// 제품명에서 용량·함량·개수 같은 규격을 뽑아 비교합니다.
// 임베딩은 '비타민D 1000IU'와 '2000IU'를 거의 같다고 보기 때문에, 숫자 규격은 규칙으로 따로 확인합니다.

// 단위 → [기준 단위, 배율]. kg·L는 g·ml로 맞춰 비교합니다 (1L = 1000ml).
const UNITS = {
  iu: ['IU', 1],
  mcg: ['mcg', 1], 'μg': ['mcg', 1], 'µg': ['mcg', 1], ug: ['mcg', 1],
  mg: ['mg', 1],
  g: ['g', 1], kg: ['g', 1000],
  ml: ['ml', 1], l: ['ml', 1000],
  '정': ['정', 1], '캡슐': ['캡슐', 1], '포': ['포', 1], '매': ['매', 1], '개입': ['개입', 1], '롤': ['롤', 1], '팩': ['팩', 1],
  w: ['W', 1], mah: ['mAh', 1],
};
// 긴 단위부터 맞춰야 'mg'가 'g'로, '개입'이 다른 것으로 잘못 잡히지 않습니다.
const unitPattern = Object.keys(UNITS).sort((a, b) => b.length - a.length)
  .map((unit) => unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
const SPEC_RE = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${unitPattern})(?![a-z])`, 'giu');

function normalize(text) {
  // NFKC: ㎖→ml, ㎎→mg, ℓ→l, 전각 숫자 → 반각
  return String(text ?? '').normalize('NFKC').toLowerCase().replace(/,(?=\d{3}\b)/g, '');
}

function format(value, unit) {
  if (unit === 'ml' && value >= 1000 && value % 1000 === 0) return `${value / 1000}L`;
  if (unit === 'g' && value >= 1000 && value % 1000 === 0) return `${value / 1000}kg`;
  return `${Number.isInteger(value) ? value : Number(value.toFixed(2))}${unit}`;
}

/** @returns {Map<string, { value: number, label: string }>} 기준 단위 → 첫 번째로 나온 값 */
export function extractSpecs(text) {
  const specs = new Map();
  for (const match of normalize(text).matchAll(SPEC_RE)) {
    const [unit, factor] = UNITS[match[2].toLowerCase()] ?? [];
    if (!unit || specs.has(unit)) continue;
    const value = Number(match[1]) * factor;
    if (Number.isFinite(value) && value > 0) specs.set(unit, { value, label: format(value, unit) });
  }
  return specs;
}

/** 규격을 뺀 이름 (비교용 압축 문자열) */
export function baseName(text) {
  return normalize(text).replace(SPEC_RE, ' ').replace(/[^0-9a-z가-힣]/g, '');
}

/** 두 이름의 같은 단위 규격 중 값이 다른 것들 */
export function specDifferences(queryText, ownedText) {
  const query = extractSpecs(queryText);
  const owned = extractSpecs(ownedText);
  const differences = [];
  for (const [unit, spec] of query) {
    const other = owned.get(unit);
    if (other && Math.abs(other.value - spec.value) > 1e-9) {
      differences.push({ unit, query: spec.label, owned: other.label });
    }
  }
  return differences;
}

/**
 * 규격을 뺀 이름이 같은지로 판정합니다. 브랜드는 검색어에 없을 수 있어 이름만으로도 비교합니다.
 * @returns {'same' | 'similar' | undefined} 이름이 다르면 undefined (임베딩 판정을 따름)
 */
export function specVerdict(queryText, product) {
  const queryBase = baseName(queryText);
  if (queryBase.length < 2) return undefined;
  const names = [[product.brand, product.name].filter(Boolean).join(' '), product.name];
  const matched = names.find((name) => baseName(name) === queryBase);
  if (!matched) return undefined;
  return specDifferences(queryText, matched).length ? 'similar' : 'same';
}
