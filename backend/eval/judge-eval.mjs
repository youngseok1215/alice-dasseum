// 중복 판정 정확도 평가 (실제 Gemini Embedding 사용)
//
// 실행 (저장소 맨 위 폴더에서):
//   node --env-file=backend/.env backend/eval/judge-eval.mjs
//
// - judge-cases.json의 보유 제품 12개와 테스트 30건으로, 서버와 똑같은 판정 함수(analyzePurchase)를 실행합니다.
// - 정답(expected)은 실행 전에 정해 둔 값입니다. 결과를 보고 정답을 바꾸지 마세요.
// - 구매 조언(LLM)은 호출하지 않습니다(판정 정확도만 측정, API 사용량 절약).
// - 결과는 backend/eval/results/ 에 Markdown과 JSON으로 저장됩니다. (DB·실제 사용자 데이터는 건드리지 않음)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzePurchase } from '../purchase-analysis.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const { owned, cases } = JSON.parse(readFileSync(join(here, 'judge-cases.json'), 'utf8'));
const delayMs = Number(process.env.EVAL_DELAY_MS ?? 700);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

if (!process.env.GEMINI_API_KEY?.trim()) {
  console.error('GEMINI_API_KEY가 없어요. node --env-file=backend/.env backend/eval/judge-eval.mjs 로 실행해 주세요.');
  process.exit(1);
}

const LABEL = { same: '동일', similar: '유사', none: '미보유' };
const rows = [];
console.log(`테스트 ${cases.length}건 실행 (보유 제품 ${owned.length}개)\n`);
for (const [index, item] of cases.entries()) {
  const { status, result } = await analyzePurchase(item.query, undefined, owned, { advice: false, debug: true });
  if (status !== 200) {
    console.error(`[${index + 1}] ${item.query} → 오류 ${status}: ${result.error}`);
    rows.push({ ...item, actual: 'error', productOk: false, error: result.error });
    continue;
  }
  const matchedId = result.matches[0]?.productId ?? null;
  const productOk = item.expected === 'none' ? result.verdict === 'none' : matchedId === item.product;
  const row = {
    ...item,
    actual: result.verdict,
    matchedBy: result.matchedBy,
    matchedId,
    productOk,
    top: result.debug?.top ?? [],
    categoryFilter: result.debug?.categoryFilter ?? null,
  };
  rows.push(row);
  const mark = row.actual === item.expected ? 'O' : (item.expected !== 'none') === (row.actual !== 'none') ? '△' : 'X';
  console.log(`${mark} [${String(index + 1).padStart(2)}] ${item.query} → ${LABEL[row.actual]} (정답 ${LABEL[item.expected]}) · ${row.matchedBy} · 상위 ${row.top[0] ? `${row.top[0].productId} ${row.top[0].similarity}` : '-'}`);
  await sleep(delayMs);
}

const valid = rows.filter((row) => row.actual !== 'error');
const pct = (n, d) => (d ? `${((n / d) * 100).toFixed(1)}%` : '-');
// ① 3단계 판정(동일/유사/미보유)이 정답과 같은 비율
const exact3 = valid.filter((row) => row.actual === row.expected).length;
// ② 중복 경고 정확도: '이미 가진 제품이 있다(동일+유사)' vs '없다'를 맞힌 비율 — 중복 구매 방지에 직접 필요한 값
const owns = (verdict) => verdict === 'same' || verdict === 'similar';
const binary = valid.filter((row) => owns(row.actual) === owns(row.expected)).length;
// ③ 경고했을 때 맞는 보유 제품을 가리켰는지
const warned = valid.filter((row) => owns(row.expected) && owns(row.actual));
const productHit = warned.filter((row) => row.matchedId === row.product).length;
const tp = valid.filter((row) => owns(row.expected) && owns(row.actual)).length;
const fn = valid.filter((row) => owns(row.expected) && !owns(row.actual)).length;
const fp = valid.filter((row) => !owns(row.expected) && owns(row.actual)).length;

// 기준값 민감도: 임베딩으로 판정된 건만 기준값을 바꿔 다시 계산 (이름 일치·규격 규칙 판정은 기준값과 무관)
const sweep = [];
for (let threshold = 0.7; threshold <= 0.9001; threshold += 0.025) {
  const correct = valid.filter((row) => {
    if (row.matchedBy === 'name') return owns(row.actual) === owns(row.expected);
    const topScore = row.top[0]?.similarity ?? 0;
    return (topScore >= threshold) === owns(row.expected);
  }).length;
  sweep.push({ threshold: Number(threshold.toFixed(3)), binary: pct(correct, valid.length) });
}

const byType = {};
for (const row of valid) {
  byType[row.type] ??= { total: 0, ok: 0 };
  byType[row.type].total += 1;
  if (owns(row.actual) === owns(row.expected)) byType[row.type].ok += 1;
}

const date = new Date().toISOString().slice(0, 10);
const lines = [
  `# 다씀 중복 판정 정확도 평가 (${date})`,
  '',
  `- 모델: Gemini Embedding (gemini-embedding-001, 768차원) + 이름 일치·규격 규칙, 유사도 기준값 0.8`,
  `- 테스트: 보유 제품 ${owned.length}개, 구매 예정 제품 ${cases.length}건 (동일 ${cases.filter((c) => c.expected === 'same').length} / 유사 ${cases.filter((c) => c.expected === 'similar').length} / 미보유 ${cases.filter((c) => c.expected === 'none').length})`,
  `- 정답은 실행 전에 정해 둔 값 (backend/eval/judge-cases.json)`,
  valid.length < rows.length ? `- 오류로 제외: ${rows.length - valid.length}건` : '',
  '',
  '## 결과',
  '',
  '| 지표 | 결과 |',
  '|---|---|',
  `| 중복 경고 정확도 (보유 있음/없음을 맞힘) | **${pct(binary, valid.length)}** (${binary}/${valid.length}) |`,
  `| 3단계 판정 일치율 (동일/유사/미보유까지 일치) | ${pct(exact3, valid.length)} (${exact3}/${valid.length}) |`,
  `| 경고 시 올바른 보유 제품을 가리킨 비율 | ${pct(productHit, warned.length)} (${productHit}/${warned.length}) |`,
  `| 놓친 중복 (보유했는데 미보유로 판정) | ${fn}건 |`,
  `| 잘못된 경고 (없는데 보유로 판정) | ${fp}건 |`,
  '',
  '## 유형별 중복 경고 정확도',
  '',
  '| 유형 | 정확도 |',
  '|---|---|',
  ...Object.entries(byType).map(([type, { total, ok }]) => `| ${type} | ${pct(ok, total)} (${ok}/${total}) |`),
  '',
  '## 유사도 기준값을 바꿨을 때 (참고)',
  '',
  '| 기준값 | 중복 경고 정확도 |',
  '|---|---|',
  ...sweep.map((item) => `| ${item.threshold}${item.threshold === 0.8 ? ' (현재)' : ''} | ${item.binary} |`),
  '',
  '같은 30건으로 기준값을 고르면 결과가 부풀려질 수 있어요. 기준값을 바꾼다면 "조정 전/후"를 함께 표기하세요.',
  '',
  '## 전체 결과',
  '',
  '| # | 구매 예정 제품 | 정답 | 판정 | 판정 근거 | 가리킨 보유 제품 | 최고 유사도 |',
  '|---|---|---|---|---|---|---|',
  ...rows.map((row, i) => {
    const target = owned.find((p) => p.id === row.matchedId);
    return `| ${i + 1} | ${row.query} | ${LABEL[row.expected]} | ${LABEL[row.actual] ?? row.actual}${row.actual === row.expected ? '' : ' ✗'} | ${row.matchedBy ?? '-'} | ${target ? `${target.brand} ${target.name}` : '-'} | ${row.top?.[0]?.similarity ?? '-'} |`;
  }),
  '',
].filter((line) => line !== null);

const outDir = join(here, 'results');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, `judge-eval-${date}.md`), lines.join('\n'));
writeFileSync(join(outDir, `judge-eval-${date}.json`), JSON.stringify({ date, rows, sweep }, null, 2));
console.log(`\n중복 경고 정확도 ${pct(binary, valid.length)} · 3단계 일치율 ${pct(exact3, valid.length)} · 놓친 중복 ${fn} · 잘못된 경고 ${fp}`);
console.log(`결과 저장: backend/eval/results/judge-eval-${date}.md`);
