# 화면 이동 흐름 (navigation-flow)

## 전체 흐름
```
[0 스플래시] --1.8s replace--> [1 홈]

하단 탭: 홈 | 구매 전 확인 | 내 물품 | 설정

[1 홈]
 ├─ 구매 전 확인 카드 ─────────> [2 구매 전 확인]
 ├─ 제품 등록 카드 ───────────> [3 촬영(등록 모드)] ─촬영─> (기존 물품 등록 목업)
 ├─ 먼저 써야 할 제품 카드 ────> [6 상세]
 ├─ 전체보기 ────────────────> [+ 먼저 써야 할 제품] ─행─> [6 상세]
 ├─ 사용기한 임박 행 ─────────> [6 상세]
 └─ 소비 관리 카드 ───────────> [8 다씀 기록 · 구매 보류 탭]

[2 구매 전 확인]
 ├─ 확인하기 / 최근 확인 ─────> [4 AI 확인 중 (search)]
 └─ 사진으로 확인하기 ────────> [3 촬영] ─촬영/앨범─> [4 AI 확인 중 (photo)]

[4 AI 확인 중] ─완료 replace─> [5 결과]   ·  취소 → back

[5 결과]
 ├─ 보유 제품 상세 보기 ──────> [6 상세] ─back─> [5]
 ├─ 구매 보류 ───────────────> [7 구매 보류 완료]
 ├─ 그래도 구매할게요 ────────> [2] (스택 리셋)
 └─ (none) 확인 완료 / 다시 확인하기 ─> [2] (스택 리셋)

[7 구매 보류 완료]
 ├─ 확인 ───────────────────> [2] (스택 리셋)
 └─ 구매 보류 기록 보기 ──────> [8 · 구매 보류 탭]

[6 상세] ─다씀 replace─> [+ 다씀 완료]
 [+ 다씀 완료] ─확인 back─> (상세 이전 화면) · 다씀 기록 보기 → [8 · 다씀 탭]

[+ 내 물품] ─행─> [6 상세]
```

## expo-router 매핑안 (기존 라우트 확인 후 조정)
| 프로토타입 | 제안 경로 | 이동 방식 | 파라미터 |
|---|---|---|---|
| splash | `src/app/index.tsx` 또는 기존 로딩 화면 | `router.replace('/(tabs)')` | – |
| home | `(tabs)/index.tsx` | 탭 | – |
| check | `(tabs)/check.tsx` | 탭 / `router.dismissTo` | `q?` (테스트 검색어 미리 채우기) |
| camera | `check/camera.tsx` | push | `purpose: 'check' \| 'register'` |
| analyzing | `check/analyzing.tsx` | push | `mode: 'search' \| 'photo'`, `q?`, `imageUri?` |
| result | `check/result.tsx` | replace(analyzing 대체) | `checkId` (또는 mode·q) |
| detail | `product/[id].tsx` | push | `id` |
| held | `check/held.tsx` | push | `productId` |
| record | `records.tsx` | push | `tab: 'hold' \| 'done'` |
| items | `(tabs)/items.tsx` | 탭 | – |
| first | `first.tsx` | push | – |
| done | `done/[id].tsx` | replace(상세 대체) | `id` |

- 스택 리셋(→ 2): 프로토타입은 스택을 `[check]`로 초기화합니다. expo-router에서는 `router.dismissAll()` 후 `router.navigate('/(tabs)/check')` 등으로 구현합니다.
- 결과·완료 화면은 replace를 써서 뒤로가기로 '확인 중'이나 상세(다씀 이전)로 돌아가지 않게 합니다.
- 전환: Stack `screenOptions={{ animation: 'fade' }}` (250ms).
- 하단 탭은 홈·구매 전 확인·내 물품에서만 보입니다. 나머지는 탭 위 Stack 화면입니다.
