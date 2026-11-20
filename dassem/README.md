> 이전 개발 자료입니다. 현재 실행 앱과 검증 범위는 [루트 README](../README.md)를 참고하세요. 아래 내용은 당시 설계 기록입니다.

# 다씀(DASSEM) 디자인 전달 패키지 v2

React Native + Expo 앱에 적용하기 위한 디자인 전달 자료입니다. `reference/`의 HTML은 **디자인 참고용**이며 앱 실행 코드가 아닙니다. HTML/CSS를 그대로 옮기지 말고 `theme/`의 토큰과 공통 컴포넌트를 기준으로 구현해 주세요.

> 이 패키지는 기존 Expo 저장소(`youngseok1215/alice-dasseum`, `feature/home-ui`)를 직접 확인하지 않은 상태에서 작성했습니다. 기존 코드와의 화면 비교, 경로 매핑, 충돌 파일은 **확인 필요** 항목으로 표시했습니다.

## 폴더 구성
```
design_handoff_dasseum_v2/
├─ README.md
├─ docs/
│  ├─ screen-spec.md        화면별 구성·문구·상태
│  ├─ navigation-flow.md    화면 이동 구조, expo-router 매핑안
│  ├─ state-spec.md         앱 상태·목업 데이터·판정 로직
│  ├─ backend-spec.md       데이터 모델
│  ├─ api-spec.md           화면별 API 요청·응답 예시
│  ├─ ai-requirements.md    제품 인식·중복 매칭 AI 입출력
│  └─ open-questions.md     미확정 항목
├─ theme/
│  ├─ tokens.ts             색상·글꼴·간격·radius·그림자·모션 토큰
│  └─ components.tsx        공통 RN 컴포넌트(Button, Card, Badge, Chip, SearchInput, InfoBanner, Mascot 등)
├─ assets/
│  ├─ logo/                 로고 사양(텍스트 로고타입)
│  ├─ character/            마스코트 PNG 4종 + 원본 시트
│  └─ screen-assets/        화면용 이미지 목록
└─ reference/
   ├─ dasseum-prototype-standalone.html   최신 프로토타입(오프라인 실행)
   ├─ source/screens.jsx                  프로토타입 화면 소스(웹 React)
   └─ docs/                               PRD v0.2, 가설·테스트 가이드
```

## 디자인 변경 요약
- 브랜드 컬러를 Soft Mint & Cream으로 정리했습니다. 배경 #F7FAF8, 보조 배경 #F2EDE5, 강조 카드 #D9EFE9, 메인 민트 #7ED8C8, 포인트 #3EB6A6.
- Primary 버튼 라벨은 흰색이 아니라 #171719입니다. 흰색을 쓰면 민트 위 대비가 약 1.7:1이라 읽기 어렵습니다.
- 공식 마스코트 4종을 정해진 화면에만 씁니다. 스플래시·홈은 기본 미소, AI 확인 중은 검색, 구매 보류 완료는 보류, 다씀 완료는 완료 버전입니다.
- 스플래시 화면을 추가했습니다(약 1.8초 후 홈으로 페이드).
- 구매 전 확인 흐름을 정리했습니다: 검색/촬영 → AI 확인 중 → 결과(동일·유사·없음) → 보유 제품 상세 → 구매 보류 완료 → 다씀 기록.
- 다씀 완료 화면, '먼저 써야 할 제품' 전체 목록, 내 제품 목록(카테고리 칩)을 추가했습니다.
- 결과 화면에서 '결과가 달라요' 버튼은 제거했습니다.

## 현재 Expo 프로젝트와 연결하는 방법
1. `theme/tokens.ts` 내용을 `dassem/src/theme/`에 병합합니다. 기존 토큰 파일이 있으면 이름 충돌을 먼저 확인합니다.
2. `theme/components.tsx`를 `dassem/src/components/ui/`(제안 경로)로 나눠 넣습니다. 기존 공통 컴포넌트가 있으면 스타일 값만 토큰으로 교체합니다.
3. `assets/character/*.png`를 `dassem/assets/images/mascot/`(제안 경로)에 넣고 `expo-image`로 불러옵니다.
4. `docs/state-spec.md`의 필드를 `dassem/src/types/product.ts`, `dassem/src/data/mock-products.ts`와 비교해 누락 필드만 추가합니다.
5. 화면은 `docs/navigation-flow.md`의 매핑표를 기준으로 기존 라우트를 유지하며 수정합니다.

## 화면별 개발 경로 (제안 · 기존 라우트 확인 필요)
| 화면 | 프로토타입 키 | 제안 경로 (`dassem/src/app`) | 기존 구현 |
|---|---|---|---|
| 0 스플래시 | splash | 기존 로딩 화면 교체 (`index.tsx` 또는 `_layout.tsx`의 스플래시 처리) | 로딩 화면 있음 |
| 1 홈 | home | `(tabs)/index.tsx` | 있음 |
| 2 구매 전 확인 | check | `(tabs)/check.tsx` | 있음 |
| 3 사진으로 확인 / 제품 등록 촬영 | camera | `check/camera.tsx` (등록은 `register` 경로에서 재사용) | 물품 등록 있음 |
| 4 AI 확인 중 | analyzing | `check/analyzing.tsx` | 없음(추정) |
| 5 AI 확인 결과 | result | `check/result.tsx` | 있음 |
| 6 보유 제품 상세 | detail | `product/[id].tsx` | 확인 필요 |
| 7 구매 보류 완료 | held | `check/held.tsx` | 없음(추정) |
| 8 다씀 기록 | record | `records.tsx` | 없음(추정) |
| + 내 물품 | items | `(tabs)/items.tsx` | 있음 |
| + 먼저 써야 할 제품 | first | `first.tsx` | 없음(추정) |
| + 다씀 완료 | done | `done/[id].tsx` | 없음(추정) |
| 설정 | – | `(tabs)/settings.tsx` | 임시 화면 있음, 이번 디자인 범위 밖 |

## 추가·수정해야 할 파일 (예상)
- 추가: `src/theme/tokens.ts`(또는 병합), `src/components/ui/*`, `assets/images/mascot/*`, 결과 이후 화면(held, done, records, first, analyzing, product/[id])
- 수정: 홈, 구매 전 확인, AI 확인 결과, 내 물품, 하단 탭, 로딩 화면, `types/product.ts`, `data/mock-products.ts`

### 충돌 가능성이 있는 파일 (확인 필요)
- `src/theme/*`: 기존 색상 이름(primary 등)이 다른 값으로 쓰이고 있을 수 있습니다.
- `src/types/product.ts`: `openedAt`, `expiresAt` 등 필드명·날짜 형식 차이.
- `src/data/mock-products.ts`: 기존 '안약 → 인공눈물 유사' 목업과 프로토타입의 비타민D 목업이 다릅니다. 둘 다 유지하는 것을 권장합니다.
- `src/app/(tabs)/_layout.tsx`: 탭 이름·순서(홈 · 구매 전 확인 · 내 물품 · 설정).
- 로딩 화면 파일: 스플래시로 교체할 때 `expo-splash-screen` 설정과 겹칠 수 있습니다.

## 그대로 유지할 기존 기능
- 촬영 버튼 → 비타민D 정보 자동 입력(물품 등록 목업)
- 안약 검색 → 인공눈물 '유사' 결과
- 내 물품 카테고리 필터
- 기존 화면 간 이동과 expo-router 경로

## 목업과 실제 기능 구분
| 기능 | 디자인 | 프로토타입 동작 | 실제 구현 |
|---|---|---|---|
| 검색 중복 확인 | 있음 | 키워드 규칙으로 판정 | API·AI 필요 |
| 사진 중복 확인 | 있음 | 항상 '동일' | 카메라·AI 필요 |
| 제품 등록 촬영 | 있음 | 촬영 화면만, 이후 홈 복귀 | 카메라·AI·저장 필요 |
| 구매 보류 기록 | 있음 | 로컬 상태 | DB 저장 필요 |
| 다씀 처리 | 있음 | 로컬 상태 | DB 저장 필요 |
| 사용기한 알림 | 홈 아이콘만 | 미구현 | 푸시 알림 필요 |
| 설정, 수정·삭제, 결과 정정 | PRD에만 | 미구현 | 미정 |

## 필요한 이미지 및 글꼴
- 마스코트 4종 PNG(`assets/character`). **모두 배경이 불투명**해서 투명 배경 원본이 필요합니다(`assets/screen-assets/README.md` 참고).
- 로고는 이미지가 아닌 텍스트 로고타입입니다(`assets/logo/README.md`).
- 글꼴: Pretendard(본문), Wanted Sans(로고). `expo-font`로 로드합니다.
- 제품 사진은 플레이스홀더입니다. 실제 이미지는 등록 시 촬영 사진을 씁니다.

## 개발 적용 순서
1. 토큰·글꼴·이미지 추가
2. 공통 컴포넌트(Button, Card, Badge, Chip, SearchInput, InfoBanner, Mascot, TopBar)
3. 스플래시 → 홈 → 하단 탭
4. 구매 전 확인 → AI 확인 중 → 결과(3가지 상태)
5. 보유 제품 상세 → 구매 보류 완료 → 다씀 기록
6. 내 물품, 먼저 써야 할 제품, 다씀 완료
7. 목업 데이터와 판정 로직을 `state-spec.md` 기준으로 정리
8. 백엔드 연동(`api-spec.md`)

## 프로토타입 실행
`reference/dasseum-prototype-standalone.html`을 브라우저에서 엽니다. 오른쪽 패널에서 화면 바로가기와 테스트 검색어(동일: 비타민D / 유사: 온데이 비타민D3 2000IU / 없음: 오메가3)를 쓸 수 있습니다.
