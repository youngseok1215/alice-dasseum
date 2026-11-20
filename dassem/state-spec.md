# 상태 명세 (state-spec)

## 제품 타입 (프로토타입 기준 · `src/types/product.ts`와 비교 필요)
```ts
export type Category = '화장품' | '영양제' | '의약품' | '생활용품';

export interface Product {
  id: string;
  name: string;
  brand?: string;
  category: Category;
  imageUri?: string;
  openedAt: string | null;     // 'YYYY-MM-DD', 미개봉 null
  expiresAt: string | null;    // 표기 사용기한, 미입력 null
  registeredAt: string;
  memo?: string;
  status: 'owned' | 'done';
  completedAt?: string | null;
  // 계산 필드 (클라이언트 또는 서버)
  dday?: number | null;        // expiresAt - today
  recommendReason?: string;    // '사용기한 D-7', '개봉 2개월째'
}
```
프로토타입은 날짜를 'YYYY.MM.DD' 문자열, D-day를 고정값으로 씁니다. 앱에서는 ISO 날짜로 저장하고 표시할 때 'YYYY.MM.DD'로 포맷합니다. 기준일(목업) 2026-11-12.

## 목업 데이터 (프로토타입)
| id | 이름 | 브랜드 | 카테고리 | 개봉 | 사용기한 | D-day | 추천 사유 |
|---|---|---|---|---|---|---|---|
| vitd | 온데이 비타민D3 1000IU 90정 | 온데이 | 영양제 | 2026-09-03 | 2027-06-30 | 230 | – (메모: 주방 선반 보관) |
| toner | 약산성 진정 토너 300ml | 라온스킨 | 화장품 | 2026-05-02 | 2026-11-19 | 7 | 사용기한 D-7 |
| multi | 멀티비타민 60정 | 하루웰 | 영양제 | 2026-08-01 | 2026-12-05 | 23 | 사용기한 D-23 |
| sun | 데일리 선크림 SPF50+ 50ml | 선데이즈 | 화장품 | 2026-09-10 | 2027-03-10 | 118 | 개봉 2개월째 |
| eye | 인공눈물 일회용 30개입 | 맑은눈 | 의약품 | 미개봉 | 2026-11-10 | -2 | – |
| shampoo | 퍼퓸 샴푸 1L | 배스데이 | 생활용품 | 2026-10-20 | 미입력 | null | – |

브랜드명은 모두 가상입니다. 기존 `mock-products.ts`의 비타민D·인공눈물 데이터와 합칠 때 id 충돌을 확인하세요.

## 중복 확인 판정 (목업 규칙)
```ts
function matchQuery(q: string, mode: 'search' | 'photo') {
  if (mode === 'photo') return { verdict: 'same', items: ['vitd'] };
  const s = q.toLowerCase().replace(/\s/g, '');
  if (/2000/.test(s) && /비타민d|vitamind/.test(s)) return { verdict: 'similar', items: ['vitd'] };
  if (/비타민d|vitamind|비타민디/.test(s)) return { verdict: 'same', items: ['vitd'] };
  return { verdict: 'none', items: [] };
}
```
기존 Expo 목업 '안약 → 인공눈물(similar)'을 이 규칙에 추가해 함께 유지합니다.

## 기록 데이터
```ts
interface HoldRecord { id: string; name: string; match: '동일' | '유사'; date: string; productId?: string; isNew?: boolean }
interface DoneRecord { id: string; name: string; category: Category; date: string; productId?: string; isNew?: boolean }
interface RecentCheck { q: string; date: string }  // 최대 5개, 최신순, 중복 제거
```
초기값: 보류 2건(데일리 선크림 11.08 동일, 약산성 진정 토너 11.03 동일), 다씀 3건(클렌징폼 11.10 화장품, 핸드워시 리필 11.05 생활용품, 립밤 11.01 화장품), 최근 확인 2건.
'전체' 기간 목업 수치: 다씀 = 11 + 이번 달 건수, 보류 = 이번 달 + 5.

## 앱 상태
| 상태 | 변경 시점 | 영향 |
|---|---|---|
| query | 검색 입력 | 2 검색창. 결과 후 '그래도 구매/확인 완료' 시 초기화 |
| recents | 검색으로 4 진입 시 앞에 추가 | 2 최근 확인 |
| holdList | 5에서 구매 보류 | 1 소비 관리, 7 횟수, 8 |
| doneList / completedIds | 6에서 다씀 | 1 소비 관리, 내 물품·먼저 써야 할 제품에서 제외, 8, 다씀 완료 누적 |
| openedAt(로컬) | 6에서 '오늘 개봉했어요' | 6 표시 |

프로토타입은 localStorage에 저장합니다. 앱 목업 단계에서는 Zustand/Context + AsyncStorage 등 기존 방식을 따르고, 백엔드 연동 후 서버 데이터로 교체합니다.

## 화면별 상태
- 2: 검색어 없음 → 확인하기 비활성 / 최근 확인 없음 문구
- 4: 진행 중 · (실제) 실패 · 10초 초과
- 5: same / similar / none, 영양제·의약품 여부에 따라 고지 추가
- 6: 미개봉 → 개봉 버튼, 기한 미입력 → '기한 미입력' 배지, 추천 사유 유무
- 8: 기간(이번 달/전체) × 탭(보류/다씀), 방금 추가 항목 표시
- 내 물품: 카테고리 선택, 빈 카테고리
