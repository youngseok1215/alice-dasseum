# 다씀 개발 전달 패키지

다씀은 사용자가 보유한 물품을 등록하고, 새로 구매하기 전에 비슷한 물품이 있는지 확인해 중복 구매를 줄이는 Expo 앱입니다.

이 패키지는 디자인 시안 2a를 실제 Expo 개발환경으로 옮긴 프론트엔드 MVP입니다. 화면 이동과 주요 동작은 구현되어 있지만, 현재 제품 데이터와 AI 인식 결과는 테스트용 목업 데이터입니다.

## 실행 방법

필수 환경: Node.js LTS, npm

```powershell
npm install
npx.cmd expo start --clear
```

실행 후 터미널에서:

- `w`: 웹 실행
- QR 코드: Expo Go에서 실행
- `Ctrl + C`: 개발 서버 종료

PowerShell 실행 정책 때문에 `npx`가 차단되면 반드시 `npx.cmd`를 사용하세요.

## 현재 구현된 화면

- 로딩 화면: 2.6초 후 홈 이동
- 홈: 물품 등록, 구매 전 확인, 최근 AI 결과, 기한 임박 물품
- 물품 등록: AI 사진 인식 시뮬레이션, 직접 입력, 입력 검증
- 구매 전 확인: 검색어 입력, 인기 검색어, 보유 제품 미리보기
- AI 확인 결과: 보유 제품 있음/없음 상태
- 내 물품: 카테고리 필터, 유통기한 기준 사용 순서
- 설정: 임시 화면

## 확인 가능한 데모 흐름

### 중복 구매 확인

1. 홈에서 `구매 전 확인`
2. 인기 검색어 `안약`
3. `AI로 확인하기`
4. 보유 중인 `인공눈물`이 비슷한 제품으로 표시됨

### AI 물품 등록

1. 홈에서 `물품 등록`
2. `촬영하고 AI로 인식하기`
3. 약 1.6초 후 비타민D 정보가 자동 입력됨
4. 등록 버튼을 누르면 AI 확인 결과로 이동

## 프로젝트 구조

```text
src/
  app/
    _layout.tsx          폰트 로딩 및 최상위 화면 구조
    index.tsx            로딩 화면
    (tabs)/index.tsx     홈
    (tabs)/items.tsx     내 물품
    (tabs)/settings.tsx  설정
    register.tsx         물품 등록
    search.tsx           구매 전 확인
    result.tsx           AI 확인 결과
  components/            화면 공통 부품
  data/mock-products.ts  현재 테스트용 고정 데이터와 임시 검색 로직
  theme/                 디자인 토큰과 공통 UI 부품
  types/product.ts       제품 데이터 타입
assets/
  dasseum/               캐릭터와 로고
  fonts/                 Pretendard 글꼴
```

## 백엔드 연결 지점

현재 `src/data/mock-products.ts`를 직접 사용하는 부분을 API 호출로 교체하면 됩니다.

| 기능 | 현재 동작 | 백엔드 연결 제안 |
|---|---|---|
| 보유 물품 목록 | `mockProducts` 배열 | `GET /api/products` |
| 물품 등록 | 결과 화면으로만 이동 | `POST /api/products` |
| 제품 검색 | 제품명 포함 여부로 비교 | `POST /api/products/search` |
| 이미지 인식 | 1.6초 후 고정값 입력 | `POST /api/ai/recognize` |
| 중복 판정 | 프론트 임시 별칭 사용 | `POST /api/ai/duplicate-check` |

권장 응답 형태:

```ts
type Product = {
  id: string;
  name: string;
  category: '화장품' | '영양제' | '의약품' | '생활용품';
  openedAt?: string;
  expiresAt?: string;
  imageUri?: string;
  quantity: number;
};

type DuplicateMatch = {
  product: Product;
  match: 'same' | 'similar';
  confidence?: number;
  reason?: string;
};
```

## 백엔드 연결 시 권장 작업 순서

1. API 기본 주소와 공통 요청 함수를 `src/services/`에 추가
2. 보유 물품 목록 조회 연결
3. 물품 등록 API 연결
4. 제품명 기반 중복 검색 연결
5. 사진 업로드와 AI 인식 연결
6. 로딩·실패·재시도 상태 추가
7. 실제 DB에 등록 내용이 유지되는지 확인

프론트 화면에서 API를 직접 여러 번 호출하기보다 `src/services/products.ts`, `src/services/ai.ts`처럼 분리하는 방식을 권장합니다.

## 현재 목업 데이터의 한계

- 새로고침하면 사용자가 입력한 내용이 저장되지 않습니다.
- 촬영 버튼은 실제 카메라나 이미지 분석을 사용하지 않습니다.
- `안약`은 항상 `인공눈물`과 연결됩니다.
- 로그인, 사용자 구분, 데이터베이스가 없습니다.
- 캐릭터와 로고 원본은 투명 배경 이미지가 아니므로 추후 교체가 필요합니다.

## 개발 검사

```powershell
npx.cmd expo lint
npx.cmd tsc --noEmit
```

전달 시점 기준으로 타입 검사, 코드 검사, 웹 빌드를 통과했습니다.
