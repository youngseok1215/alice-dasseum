# API 명세 (api-spec) — 제안

REST 예시입니다. 경로·인증 헤더는 백엔드 결정에 따릅니다. 날짜는 ISO 8601.

## 1 홈
`GET /home/summary`
```json
{
  "attentionCount": 2,
  "recommended": [
    { "id": "toner", "name": "약산성 진정 토너 300ml", "category": "cosmetic", "imageUrl": null, "dday": 7, "reason": "사용기한 D-7" }
  ],
  "expiringSoon": [
    { "id": "eye", "name": "인공눈물 일회용 30개입", "category": "medicine", "openedAt": null, "dday": -2 }
  ],
  "month": { "doneCount": 3, "holdCount": 2 }
}
```

## 먼저 써야 할 제품
`GET /products/recommended` → `{ "items": [Product & { reason, rank }] }`

## 내 물품
`GET /products?status=owned&category=supplement&sort=dday`
```json
{ "items": [ { "id": "vitd", "name": "온데이 비타민D3 1000IU 90정", "brand": "온데이", "category": "supplement", "openedAt": "2026-09-03", "expiresAt": "2027-06-30", "dday": 230 } ],
  "counts": { "all": 6, "cosmetic": 2, "supplement": 2, "medicine": 1, "household": 1 } }
```

## 6 보유 제품 상세
`GET /products/{id}` → Product 전체 + `reason`
`PATCH /products/{id}` `{ "openedAt": "2026-11-12" }` ('오늘 개봉했어요')

## 다씀
`POST /products/{id}/complete`
```json
// 200
{ "product": { "id": "vitd", "status": "done", "completedAt": "2026-11-12T09:00:00Z" }, "totalDone": 15 }
```
실행 취소 API(`POST /products/{id}/complete/undo`)는 PRD에 있으나 이번 디자인에서 미적용(미정).

## 2 구매 전 확인 — 최근 확인
`GET /checks/recent` → `{ "items": [ { "q": "데일리 선크림 SPF50+", "createdAt": "2026-11-08" } ] }`
`DELETE /checks/recent/{id}`

## 4→5 중복 확인
검색: `POST /checks` `{ "mode": "search", "query": "비타민D" }`
사진: `POST /checks` (multipart) `mode=photo`, `image=@file.jpg`
```json
// 200 — same
{
  "checkId": "c_123",
  "mode": "search",
  "query": "비타민D",
  "verdict": "same",
  "matches": [
    { "productId": "vitd", "name": "온데이 비타민D3 1000IU 90정", "brand": "온데이", "category": "supplement",
      "openedAt": "2026-09-03", "expiresAt": "2027-06-30", "dday": 230,
      "matchType": "same", "difference": null }
  ],
  "notices": ["AI_REFERENCE_ONLY", "NO_MEDICAL_JUDGEMENT"]
}
// similar
{ "verdict": "similar", "matches": [ { "productId": "vitd", "matchType": "similar", "difference": "용량이 달라요 (1000IU · 2000IU)" } ] }
// none
{ "verdict": "none", "matches": [] }
// 인식 실패 (사진)
{ "verdict": null, "reason": "IMAGE_UNREADABLE", "message": "제품 이름이 잘 보이지 않아요" }
```
- `notices`: 클라이언트 고지 문구 키. NO_MEDICAL_JUDGEMENT는 영양제·의약품 매칭 시 포함.
- 프로토타입 문구 매핑은 screen-spec 5장 표 참고.

## 구매 결정
`POST /checks/{checkId}/decision` `{ "decision": "hold" | "buy" }`
```json
// hold → 200
{ "holdRecord": { "id": "h_9", "queryText": "비타민D", "verdict": "same", "matchedProductId": "vitd", "createdAt": "2026-11-12" }, "monthHoldCount": 3 }
```
`none` 결과의 '확인 완료'는 호출 생략 또는 `decision: "none"`(미정).

## 8 다씀 기록
`GET /records/summary?period=month|all`
```json
{ "doneCount": 3, "holdCount": 3, "byCategory": { "cosmetic": 2, "household": 1, "supplement": 0, "medicine": 0 } }
```
`GET /records?type=hold|done&period=month` → `{ "items": [ { "id": "h_9", "name": "비타민D", "match": "same", "date": "2026-11-12" } ] }`

## 제품 등록 (이번 디자인 범위 밖 · 기존 목업 유지)
`POST /products/recognize` (multipart image) → ai-requirements의 인식 출력
`POST /products` → 확인·수정된 값 저장

## 알림 설정
`GET /settings/notifications` · `PATCH /settings/notifications` `{ "expiryAlertEnabled": true, "thresholdDays": 30 }`
