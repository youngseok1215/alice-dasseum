import { fetchWithRetry, geminiBaseUrl } from './http-util.mjs';
import { specDifferences, specVerdict } from './product-spec.mjs';

export const embeddingModel = 'gemini-embedding-001';
export const embeddingDimensions = 768;
const adviceModel = 'gemini-3.5-flash-lite';
// 같은 요청 안에서 중복 호출을 막는 메모리 캐시(텍스트 → Promise). 영구 저장은 embedding-store.mjs.
const embeddingCache = new Map();

function compact(value) {
  return String(value ?? '').normalize('NFKC').toLowerCase().replace(/[^0-9a-z가-힣]/g, '');
}

function productText(product) {
  return [product.brand, product.name].filter(Boolean).join(' ');
}

function inferCategory(value) {
  const text = compact(value);
  const rules = [
    ['생활용품', /샴푸|린스|트리트먼트|치약|칫솔|세제|섬유유연제|휴지|물티슈|주방용품|충전기|케이블/],
    ['영양제', /프로바이오틱스|유산균|비타민|영양제|오메가3|루테인|철분|마그네슘|아연|홍삼/],
    ['의약품', /의약품|감기약|진통제|소화제|연고|인공눈물|타이레놀|해열제|알레르기약/],
    ['화장품', /토너|스킨|로션|에센스|세럼|선크림|립밤|파운데이션|쿠션|클렌징|마스카라/],
  ];
  return rules.find(([, pattern]) => pattern.test(text))?.[0];
}

function cosine(left, right) {
  if (!left.length || left.length !== right.length) return 0;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] ** 2;
    rightNorm += right[index] ** 2;
  }
  return leftNorm && rightNorm ? dot / Math.sqrt(leftNorm * rightNorm) : 0;
}

async function embedText(text, apiKey) {
  const response = await fetchWithRetry(
    `${geminiBaseUrl()}/v1beta/models/${embeddingModel}:embedContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        model: `models/${embeddingModel}`,
        content: { parts: [{ text }] },
        taskType: 'SEMANTIC_SIMILARITY',
        outputDimensionality: embeddingDimensions,
      }),
    },
    { timeoutMs: 10_000, retries: 1, label: 'Gemini embedding' },
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(payload.embedding?.values)) {
    const code = payload.error?.status || response.status;
    throw new Error(`Gemini embedding request failed (${code})`);
  }
  return payload.embedding.values;
}

/** 메모리 → SQLite 캐시 → Gemini 순서로 임베딩을 찾습니다. 실패한 요청은 캐시에 남기지 않습니다. */
async function cachedEmbedding(text, apiKey, store, stats) {
  if (!embeddingCache.has(text)) {
    embeddingCache.set(text, (async () => {
      const saved = store?.get(text);
      if (saved) { stats.cached += 1; return saved; }
      const vector = await embedText(text, apiKey);
      stats.requested += 1;
      store?.set(text, vector);
      return vector;
    })());
    // 메모리 캐시는 최근 500개까지만 유지
    if (embeddingCache.size > 500) embeddingCache.delete(embeddingCache.keys().next().value);
  } else {
    stats.cached += 1;
  }
  try {
    return await embeddingCache.get(text);
  } catch (error) {
    embeddingCache.delete(text);
    throw error;
  }
}

// 날짜 계산은 LLM이 자주 틀리므로 서버에서 계산해 문장으로 넘깁니다. 기준 날짜는 한국 시간(DASSEM_TIMEZONE)입니다.
function todayIso() {
  const timeZone = process.env.DASSEM_TIMEZONE?.trim() || 'Asia/Seoul';
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function daysBetween(fromIso, toIso) {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000);
}

/** 보유 제품의 수량·사용기한·개봉 경과를 사람이 읽는 문장 조각으로 계산합니다. */
export function ownedFacts(product, today = todayIso()) {
  if (!product) return undefined;
  const quantity = Number.isSafeInteger(product.quantity) ? `${product.quantity}개` : undefined;
  let expiry = '사용기한 미입력';
  if (product.expiresAt) {
    const left = daysBetween(today, product.expiresAt);
    expiry = left < 0 ? `사용기한이 ${-left}일 지남` : left === 0 ? '사용기한이 오늘까지' : `사용기한 ${left}일 남음 (D-${left})`;
  }
  let opened = '미개봉';
  if (product.openedAt) {
    const days = daysBetween(product.openedAt, today);
    const months = Math.floor(days / 30.44);
    opened = days < 0 ? '개봉일 확인 필요' : months >= 1 ? `개봉 ${months}개월째` : `개봉 ${days + 1}일째`;
  }
  return { quantity, expiry, opened, text: [quantity && `보유 수량 ${quantity}`, expiry, opened].filter(Boolean).join(', ') };
}

function specSentence(differences) {
  return differences.map(({ unit, owned, query }) => `보유 제품은 ${owned}, 구매 예정 제품은 ${query}로 ${unit} 규격이 달라요.`).join(' ');
}

function defaultAdvice(verdict, match, query, differences = []) {
  if (verdict === 'none') {
    return {
      decision: 'BUY',
      title: '보유한 유사 제품이 없어요',
      reason: `내 물품에서 ‘${query}’과 의미가 비슷한 제품을 찾지 못했어요. 구매 전 제품명과 용량을 한 번 더 확인해 주세요.`,
    };
  }
  // AI가 실패해도 계산된 숫자로 구체적인 안내를 만듭니다. 예: ‘비타민C’ 2개를 갖고 있어요(사용기한 30일 남음, 미개봉).
  const facts = ownedFacts(match);
  const holding = `‘${match.name}’${facts.quantity ? ` ${facts.quantity}` : ''}를 갖고 있어요 (${[facts.expiry, facts.opened].join(', ')}).`;
  if (verdict === 'similar' && differences.length) {
    return {
      decision: 'CHECK_FIRST',
      title: '용량·규격만 다른 제품을 가지고 있어요',
      reason: `${holding} ${specSentence(differences)} 지금 가진 제품으로 충분한지 확인한 뒤 구매를 결정해 주세요.`,
    };
  }
  return {
    decision: verdict === 'same' ? 'HOLD' : 'CHECK_FIRST',
    title: verdict === 'same' ? '같은 제품을 이미 가지고 있어요' : '비슷한 제품을 가지고 있어요',
    reason: `${holding} ${verdict === 'same' ? '가진 제품을 먼저 쓴 뒤 구매해 보세요.' : '어떻게 다른지, 지금 가진 걸로 충분한지 확인한 뒤 구매를 결정해 주세요.'}`,
  };
}

// Gemini Structured Output (generationConfig.responseJsonSchema, 표준 JSON Schema)
export const adviceSchema = {
  type: 'object',
  properties: {
    decision: { type: 'string', enum: ['BUY', 'CHECK_FIRST', 'HOLD'] },
    title: { type: 'string', description: '한 줄 제목 (30자 이내)' },
    reason: { type: 'string', description: '두세 문장 근거, 보유 수량·남은 기간 숫자 포함' },
  },
  required: ['decision', 'title', 'reason'],
};

function parseAdvice(content) {
  if (typeof content !== 'string') return undefined;
  const answer = content.match(/<answer>([\s\S]*?)<\/answer>/i)?.[1] ?? content;
  const value = JSON.parse(answer.trim().replace(/^```(?:json)?\s*|\s*```$/gi, ''));
  if (!value || !['BUY', 'CHECK_FIRST', 'HOLD'].includes(value.decision)) return undefined;
  if (typeof value.title !== 'string' || typeof value.reason !== 'string') return undefined;
  return {
    decision: value.decision,
    title: value.title.trim().slice(0, 80),
    reason: value.reason.trim().slice(0, 500),
  };
}

async function generateAdvice({ query, purpose, verdict, match, similarity, differences = [] }) {
  const fallback = defaultAdvice(verdict, match, query, differences);
  const prompt = `당신은 중복 구매 방지 앱의 구매 판단 도우미입니다. 아래 정보만 사용해 짧고 구체적인 한국어 안내를 만드세요.
구매 예정 제품: ${query}
구매 목적: ${purpose || '입력하지 않음'}
판정: ${verdict}
유사도: ${similarity ?? 0}
보유 제품: ${match ? JSON.stringify({ name: match.name, brand: match.brand, category: match.category }) : '없음'}
보유 제품 상태(서버 계산, 그대로 사용): ${match ? ownedFacts(match).text : '없음'}
규격 차이: ${differences.length ? specSentence(differences) : '없음'}

decision은 BUY, CHECK_FIRST, HOLD 중 하나로 정하세요. reason에는 위 '보유 제품 상태'의 수량·남은 기간 숫자를 그대로 인용하고, 날짜를 직접 계산하지 마세요. 영양제·의약품은 효능, 복용량, 대체 가능 여부를 판단하지 말고 제품명·보유 수량·사용기한 확인만 권하세요. JSON 이외의 문장은 출력하지 마세요.
{"decision":"CHECK_FIRST","title":"한 줄 제목","reason":"두세 문장 근거"}`;

  const { ELICE_VISION_ENDPOINT, ELICE_VISION_MODEL, ELICE_VISION_API_KEY } = process.env;
  try {
    let response;
    let provider;
    if (ELICE_VISION_ENDPOINT && ELICE_VISION_MODEL && ELICE_VISION_API_KEY) {
      const endpoint = new URL(ELICE_VISION_ENDPOINT);
      if (endpoint.protocol !== 'https:') throw new Error('Expected an HTTPS endpoint');
      provider = 'Elice';
      response = await fetchWithRetry(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ELICE_VISION_API_KEY}` },
        body: JSON.stringify({
          model: ELICE_VISION_MODEL,
          max_tokens: 700,
          reasoning_effort: 'low',
          messages: [{ role: 'user', content: prompt }],
        }),
      }, { timeoutMs: 12_000, retries: 1, label: 'purchase advice Elice' });
    } else if (process.env.GEMINI_API_KEY?.trim()) {
      provider = 'Gemini';
      const requestAdvice = (withSchema) => fetchWithRetry(
        `${geminiBaseUrl()}/v1beta/models/${adviceModel}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY.trim() },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            // Structured Output: decision을 세 값 중 하나로 강제
            generationConfig: {
              maxOutputTokens: 700,
              responseMimeType: 'application/json',
              ...(withSchema ? { responseJsonSchema: adviceSchema } : {}),
            },
          }),
        },
        { timeoutMs: 12_000, retries: withSchema ? 1 : 0, label: 'purchase advice Gemini' },
      );
      response = await requestAdvice(true);
      if (response.status === 400) {
        // 모델이 스키마를 받아들이지 않으면 스키마 없이 한 번만 다시 요청
        console.warn('[purchase analysis] Gemini 400 with responseJsonSchema, retrying without schema');
        response = await requestAdvice(false);
      }
    } else {
      return { ...fallback, provider: 'rules' };
    }
    if (!response.ok) throw new Error(`${provider} advice request failed (${response.status})`);
    const payload = await response.json();
    const responseText = provider === 'Gemini'
      ? payload.candidates?.[0]?.content?.parts?.filter((part) => !part.thought).map((part) => part.text).join('')
      : payload.choices?.[0]?.message?.content;
    return { ...(parseAdvice(responseText) ?? fallback), provider };
  } catch (error) {
    console.warn('[purchase analysis] Advice fallback:', error instanceof Error ? error.message : 'Error');
    return { ...fallback, provider: 'rules' };
  }
}

/**
 * @param {{ embeddingStore?: ReturnType<typeof import('./embedding-store.mjs').createEmbeddingStore> }} [options]
 */
// options.advice=false: LLM 조언 없이 기본 문장 사용 (정확도 평가용), options.debug=true: 상위 후보 점수 포함
export async function analyzePurchase(query, purpose, products, { embeddingStore, advice: useAdvice = true, debug = false } = {}) {
  if (typeof query !== 'string' || !query.trim() || query.trim().length > 200) {
    return { status: 400, result: { error: '검색어는 1~200자로 입력해 주세요.' } };
  }
  if (purpose !== undefined && (typeof purpose !== 'string' || purpose.trim().length > 200)) {
    return { status: 400, result: { error: '구매 목적을 200자 이내로 입력해 주세요.' } };
  }
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return { status: 503, result: { error: 'GEMINI_API_KEY가 백엔드에 설정되지 않았어요.' } };
  }

  try {
    const trimmed = query.trim();
    const queryCategory = inferCategory(trimmed);
    const candidates = queryCategory
      ? products.filter((product) => product.category === queryCategory)
      : products;
    const stats = { cached: 0, requested: 0 };
    const queryEmbedding = await cachedEmbedding(trimmed, apiKey, embeddingStore, stats);
    const ranked = await Promise.all(candidates.map(async (product) => ({
      product,
      similarity: cosine(queryEmbedding, await cachedEmbedding(productText(product), apiKey, embeddingStore, stats)),
    })));
    console.log(`[purchase analysis] 후보 ${candidates.length}개 · 임베딩 캐시 ${stats.cached} · 새 요청 ${stats.requested}`);
    ranked.sort((left, right) => right.similarity - left.similarity);
    const top = ranked[0];
    const queryKey = compact(trimmed);
    const productKey = top ? compact(`${top.product.brand ?? ''}${top.product.name}`) : '';
    const productNameKey = top ? compact(top.product.name) : '';
    const exact = Boolean(top && (queryKey === productKey || queryKey === productNameKey));
    const similarityThreshold = 0.8;

    // 규격 규칙: 용량·함량 표기를 뺀 이름이 같은 보유 제품이 있으면 임베딩 점수보다 우선합니다.
    // (카테고리 추정과 상관없이 전체 보유 제품에서 찾음 — 문자열 비교라 비용이 없음)
    const ruleMatches = products
      .map((product) => ({ product, verdict: specVerdict(trimmed, product) }))
      .filter((item) => item.verdict);
    const rule = ruleMatches.find((item) => item.verdict === 'same') ?? ruleMatches[0];
    const similarityOf = async (product) => ranked.find((item) => item.product.id === product.id)?.similarity
      ?? cosine(queryEmbedding, await cachedEmbedding(productText(product), apiKey, embeddingStore, stats));

    let verdict;
    let selected;
    if (exact) {
      verdict = 'same';
      selected = [top];
    } else if (rule) {
      verdict = rule.verdict;
      selected = [{ product: rule.product, similarity: await similarityOf(rule.product) }];
    } else if (!top || top.similarity < similarityThreshold) {
      verdict = 'none';
      selected = [];
    } else {
      verdict = 'similar';
      selected = ranked.filter((item) => item.similarity >= Math.max(similarityThreshold, top.similarity - 0.05)).slice(0, 3);
    }
    // 기준값(0.8) 조정용: 상위 후보 점수와 최종 판정을 로그로 남깁니다 (실제 키로 테스트할 때 확인)
    console.log(`[purchase analysis] ‘${trimmed}’ → ${verdict} (${exact ? '이름 일치' : rule ? '규격 규칙' : '임베딩'}) | 상위: ${
      ranked.slice(0, 3).map((item) => `${productText(item.product)} ${item.similarity.toFixed(3)}`).join(', ') || '후보 없음'}`);
    const matched = selected[0]?.product;
    const differences = matched
      ? (specDifferences(trimmed, productText(matched)).length
        ? specDifferences(trimmed, productText(matched))
        : specDifferences(trimmed, matched.name))
      : [];
    const advice = useAdvice ? await generateAdvice({
      query: trimmed,
      purpose: purpose?.trim(),
      verdict,
      match: matched,
      similarity: selected[0] ? Number(selected[0].similarity.toFixed(3)) : undefined,
      differences,
    }) : { ...defaultAdvice(verdict, matched, trimmed, differences), provider: 'rules' };
    return {
      status: 200,
      result: {
        query: trimmed,
        verdict,
        matches: selected.map(({ product, similarity }) => ({
          productId: product.id,
          similarity: Number(similarity.toFixed(3)),
        })),
        // 예: [{ unit: 'IU', query: '2000IU', owned: '1000IU' }] — 판정된 첫 번째 보유 제품 기준
        specDifference: differences,
        matchedBy: exact || rule ? 'name' : verdict === 'none' ? 'none' : 'embedding',
        ...advice,
        embeddingProvider: 'Gemini',
        ...(debug ? { debug: { categoryFilter: queryCategory ?? null, top: ranked.slice(0, 3).map((item) => ({ productId: item.product.id, similarity: Number(item.similarity.toFixed(4)) })) } } : {}),
      },
    };
  } catch (error) {
    console.warn('[purchase analysis] Processing failed:', error instanceof Error ? error.message : 'Error');
    return { status: 502, result: { error: '유사 제품 AI 분석에 실패했어요. 잠시 후 다시 시도해 주세요.' } };
  }
}
