# AI 요구사항 (ai-requirements)

## 원칙
- AI 결과는 확정이 아닌 **참고 정보**입니다. 화면에 항상 고지합니다.
- 영양제·의약품의 **효능, 성분 유사성, 대체 가능성, 복용 적합성을 판단하거나 문구로 생성하지 않습니다.** 식별 정보(제품명·브랜드·카테고리·용량)의 일치만 다룹니다.
- 사용기한은 제품에 표기된 공식 정보를 우선합니다.
- 사용자는 인식 결과를 등록 전 모두 수정할 수 있습니다.

## 1. 제품 인식 (등록·사진 확인 공통)
입력
```json
{ "image": "<jpeg/png, 장변 1600px 이하 권장>", "locale": "ko-KR" }
```
출력
```json
{
  "status": "ok | partial | failed",
  "fields": {
    "name":      { "value": "온데이 비타민D3 1000IU 90정", "confidence": 0.92 },
    "brand":     { "value": "온데이", "confidence": 0.88 },
    "category":  { "value": "supplement", "confidence": 0.95 },
    "volume":    { "value": "1000IU / 90정", "confidence": 0.7 },
    "expiresAt": { "value": "2027-06-30", "confidence": 0.6 }
  },
  "failReason": null
}
```
- `failReason`: `IMAGE_UNREADABLE`(흐림·어두움), `NOT_A_PRODUCT`, `TIMEOUT`
- `partial`: 인식된 필드만 채우고 나머지는 빈 값 → 클라이언트가 해당 필드에 포커스
- 신뢰도 임계값(필드 자동 채움 여부)은 미정

## 2. 중복 매칭
입력
```json
{ "query": { "text": "비타민D" } | { "recognized": <제품 인식 출력.fields> },
  "inventory": "사용자 보유 제품(status=owned) 목록" }
```
출력
```json
{ "verdict": "same | similar | none",
  "matches": [ { "productId": "vitd", "matchType": "same | similar", "score": 0.94, "difference": "용량이 달라요 (1000IU · 2000IU)" } ] }
```
판정 기준(제안 · 확정 필요)
| 판정 | 기준 |
|---|---|
| same | 브랜드 + 제품 라인 + 용량/규격 일치, 또는 검색어가 보유 제품을 특정 |
| similar | 같은 브랜드·라인의 용량·리뉴얼 차이, 또는 같은 카테고리의 같은 제품 유형(예: 선크림) |
| none | 위에 해당 없음 |
- 영양제·의약품의 similar 허용 범위는 미정입니다. 프로토타입은 '비타민D3 2000IU' 검색 시 1000IU 보유 제품을 similar로 보여 줍니다. 기존 Expo 목업은 '안약 → 인공눈물 similar'입니다.
- `difference`는 식별 정보 차이만 서술합니다. "성분이 비슷해요", "대신 드셔도 돼요" 같은 문구는 금지입니다.
- similar 최대 3개, score 내림차순.

## 3. 응답 시간·오류
- 목표: 진입~결과 중앙값 30초 이내(사용자 테스트 기준), API 자체는 수 초 이내(목표값 미정)
- 10초 초과 → 클라이언트 타임아웃 화면 + 재시도
- 실패 시 사진 확인은 "제품 이름이 잘 보이지 않아요" + [다시 찍기] / [검색으로 확인]

## 4. 데이터
- 사진 보관 기간, 학습 활용 동의, 정정 피드백 수집은 미정입니다.
