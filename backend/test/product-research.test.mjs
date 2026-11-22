import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseResearch, splitSources } from '../product-research.mjs';

test('검색 응답에서 두 제품의 사실만 꺼낸다 (앞부분 잘림·코드 블록 허용)', () => {
  const text = '앞부분이 잘린 문장 <answer>```json\n{"owned":{"facts":["건성 피부용 보습 로션"," "]},"target":{"facts":["세라마이드 함유",3]}}\n```</answer>';
  assert.deepEqual(parseResearch(text), { owned: ['건성 피부용 보습 로션'], target: ['세라마이드 함유'] });
  assert.equal(parseResearch('검색 결과 없음'), undefined);
});

test('출처 링크를 보유 제품과 구매 예정 제품으로 나눈다', () => {
  const text = '{"owned":{"facts":["가"]},"target":{"facts":["나"]}}';
  const boundary = Buffer.byteLength(text.slice(0, text.indexOf('"target"')));
  const metadata = {
    groundingChunks: [
      { web: { uri: 'https://example.com/a', title: 'a.example' } },
      { web: { uri: 'https://example.com/b', title: 'b.example' } },
      { web: { uri: 'http://insecure.example', title: 'insecure' } },
    ],
    groundingSupports: [
      { segment: { endIndex: boundary - 2 }, groundingChunkIndices: [0] },
      { segment: { endIndex: boundary + 5 }, groundingChunkIndices: [1, 2] },
    ],
  };
  const sources = splitSources(text, metadata);
  assert.deepEqual(sources.owned.map((s) => s.label), ['a.example']);
  assert.deepEqual(sources.target.map((s) => s.label), ['b.example']);
});
