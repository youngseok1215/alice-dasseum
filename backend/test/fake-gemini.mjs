// 테스트용 가짜 Gemini 서버 (GEMINI_API_BASE_URL로 지정). 실제 API 키·네트워크 없이 구매 분석 흐름을 검증합니다.
// - embedContent: 글자·두 글자 단위 해시로 만든 768차원 벡터 (이름이 비슷하면 코사인 유사도가 높음)
// - generateContent: 고정 JSON 판단 문구, 마지막 프롬프트를 기록
import { createServer } from 'node:http';

function vectorOf(text) {
  const vector = new Array(768).fill(0);
  const value = String(text).normalize('NFKC').toLowerCase().replace(/\s/g, '');
  const grams = [...value].concat([...value].slice(1).map((char, index) => value[index] + char));
  for (const gram of grams) {
    let hash = 2166136261;
    for (const code of Buffer.from(gram)) hash = Math.imul(hash ^ code, 16777619) >>> 0;
    vector[hash % 768] += 1;
  }
  return vector;
}

export async function startFakeGemini() {
  // vision: 사진 인식 응답으로 돌려줄 값, failAdvice: 판단 문구 요청을 500으로 실패시킴 (규칙 기반 대체 확인용)
  // rejectSchema: responseJsonSchema가 있으면 400 (스키마 미지원 모델 흉내)
  const state = { embedCalls: 0, embedTexts: [], adviceCalls: 0, visionCalls: 0, lastPrompt: '', lastConfig: undefined, vision: undefined, failAdvice: false, rejectSchema: false };
  const server = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    const text = body.content?.parts?.[0]?.text ?? body.contents?.[0]?.parts?.[0]?.text ?? '';
    response.setHeader('Content-Type', 'application/json');
    if (request.url.includes(':embedContent')) {
      state.embedCalls += 1;
      state.embedTexts.push(text);
      return response.end(JSON.stringify({ embedding: { values: vectorOf(text) } }));
    }
    if (request.url.includes(':generateContent') && state.rejectSchema && body.generationConfig?.responseJsonSchema) {
      response.statusCode = 400;
      return response.end(JSON.stringify({ error: { status: 'INVALID_ARGUMENT' } }));
    }
    if (request.url.includes(':generateContent') && body.contents?.[0]?.parts?.some((part) => part.inlineData)) {
      state.visionCalls += 1;
      state.lastConfig = body.generationConfig;
      return response.end(JSON.stringify({
        candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(state.vision ?? {}) }] } }],
      }));
    }
    if (request.url.includes(':generateContent')) {
      state.adviceCalls += 1;
      state.lastPrompt = text;
      state.lastConfig = body.generationConfig;
      if (state.failAdvice) { response.statusCode = 500; return response.end('{}'); }
      const answer = { decision: 'CHECK_FIRST', title: '테스트 판단', reason: '테스트용 판단 문구예요.' };
      return response.end(JSON.stringify({
        candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(answer) }] } }],
      }));
    }
    response.statusCode = 404;
    response.end('{}');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    state,
    reset() {
      Object.assign(state, { embedCalls: 0, embedTexts: [], adviceCalls: 0, visionCalls: 0, lastPrompt: '', lastConfig: undefined, vision: undefined, failAdvice: false, rejectSchema: false });
    },
    close() { server.closeAllConnections(); server.close(); },
  };
}
