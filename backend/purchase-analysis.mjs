const embeddingModel = 'gemini-embedding-001';
const adviceModel = 'gemini-3.5-flash-lite';
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
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${embeddingModel}:embedContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        model: `models/${embeddingModel}`,
        content: { parts: [{ text }] },
        taskType: 'SEMANTIC_SIMILARITY',
        outputDimensionality: 768,
      }),
      signal: AbortSignal.timeout(15_000),
    },
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(payload.embedding?.values)) {
    const code = payload.error?.status || response.status;
    throw new Error(`Gemini embedding request failed (${code})`);
  }
  return payload.embedding.values;
}

async function productEmbedding(product, apiKey) {
  const key = `${product.id}:${product.brand ?? ''}:${product.name}:${product.category}`;
  if (!embeddingCache.has(key)) embeddingCache.set(key, embedText(productText(product), apiKey));
  try {
    return await embeddingCache.get(key);
  } catch (error) {
    embeddingCache.delete(key);
    throw error;
  }
}

function defaultAdvice(verdict, match, query) {
  if (verdict === 'none') {
    return {
      decision: 'BUY',
      title: '보유한 유사 제품이 없어요',
      reason: `내 물품에서 ‘${query}’과 의미가 비슷한 제품을 찾지 못했어요. 구매 전 제품명과 용량을 한 번 더 확인해 주세요.`,
    };
  }
  const expiry = match.expiresAt ? ` 사용기한은 ${match.expiresAt}이에요.` : '';
  return {
    decision: verdict === 'same' ? 'HOLD' : 'CHECK_FIRST',
    title: verdict === 'same' ? '같은 제품을 이미 가지고 있어요' : '비슷한 제품을 가지고 있어요',
    reason: `‘${match.name}’을 보유하고 있어요.${expiry} 남은 수량과 용도를 확인한 뒤 구매를 결정해 주세요.`,
  };
}

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

async function generateAdvice({ query, purpose, verdict, match, similarity }) {
  const fallback = defaultAdvice(verdict, match, query);
  const prompt = `당신은 중복 구매 방지 앱의 구매 판단 도우미입니다. 아래 정보만 사용해 짧고 구체적인 한국어 안내를 만드세요.
구매 예정 제품: ${query}
구매 목적: ${purpose || '입력하지 않음'}
판정: ${verdict}
유사도: ${similarity ?? 0}
보유 제품: ${match ? JSON.stringify({ name: match.name, brand: match.brand, category: match.category, quantity: match.quantity, openedAt: match.openedAt, expiresAt: match.expiresAt }) : '없음'}

decision은 BUY, CHECK_FIRST, HOLD 중 하나로 정하세요. 영양제·의약품은 효능, 복용량, 대체 가능 여부를 판단하지 말고 제품명·보유 수량·사용기한 확인만 권하세요. JSON 이외의 문장은 출력하지 마세요.
{"decision":"CHECK_FIRST","title":"한 줄 제목","reason":"두세 문장 근거"}`;

  const { ELICE_VISION_ENDPOINT, ELICE_VISION_MODEL, ELICE_VISION_API_KEY } = process.env;
  try {
    let response;
    let provider;
    if (ELICE_VISION_ENDPOINT && ELICE_VISION_MODEL && ELICE_VISION_API_KEY) {
      const endpoint = new URL(ELICE_VISION_ENDPOINT);
      if (endpoint.protocol !== 'https:') throw new Error('Expected an HTTPS endpoint');
      provider = 'Elice';
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ELICE_VISION_API_KEY}` },
        body: JSON.stringify({
          model: ELICE_VISION_MODEL,
          max_tokens: 700,
          reasoning_effort: 'low',
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: AbortSignal.timeout(20_000),
      });
    } else if (process.env.GEMINI_API_KEY?.trim()) {
      provider = 'Gemini';
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${adviceModel}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY.trim() },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 700, responseMimeType: 'application/json' },
          }),
          signal: AbortSignal.timeout(20_000),
        },
      );
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

export async function analyzePurchase(query, purpose, products) {
  if (typeof query !== 'string' || !query.trim() || query.trim().length > 200) {
    return { status: 400, result: { error: 'query must contain 1 to 200 characters' } };
  }
  if (purpose !== undefined && (typeof purpose !== 'string' || purpose.trim().length > 200)) {
    return { status: 400, result: { error: 'purpose is invalid' } };
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
    const queryEmbedding = await embedText(trimmed, apiKey);
    const ranked = await Promise.all(candidates.map(async (product) => ({
      product,
      similarity: cosine(queryEmbedding, await productEmbedding(product, apiKey)),
    })));
    ranked.sort((left, right) => right.similarity - left.similarity);
    const top = ranked[0];
    const queryKey = compact(trimmed);
    const productKey = top ? compact(`${top.product.brand ?? ''}${top.product.name}`) : '';
    const productNameKey = top ? compact(top.product.name) : '';
    const exact = Boolean(top && (queryKey === productKey || queryKey === productNameKey));
    const similarityThreshold = 0.8;
    const verdict = exact ? 'same' : !top || top.similarity < similarityThreshold ? 'none' : 'similar';
    const selected = verdict === 'none'
      ? []
      : verdict === 'same'
        ? [top]
        : ranked.filter((item) => item.similarity >= Math.max(similarityThreshold, top.similarity - 0.05)).slice(0, 3);
    const advice = await generateAdvice({
      query: trimmed,
      purpose: purpose?.trim(),
      verdict,
      match: selected[0]?.product,
      similarity: selected[0] ? Number(selected[0].similarity.toFixed(3)) : undefined,
    });
    return {
      status: 200,
      result: {
        query: trimmed,
        verdict,
        matches: selected.map(({ product, similarity }) => ({
          productId: product.id,
          similarity: Number(similarity.toFixed(3)),
        })),
        ...advice,
        embeddingProvider: 'Gemini',
      },
    };
  } catch (error) {
    console.warn('[purchase analysis] Processing failed:', error instanceof Error ? error.message : 'Error');
    return { status: 502, result: { error: '유사 제품 AI 분석에 실패했어요. 잠시 후 다시 시도해 주세요.' } };
  }
}
