# 다씀 (Dasseum) — 프론트엔드 앱

최종 디자인 시안(`dasseum-prototype-v14.html`)을 **Expo SDK 58 + React Native**로 옮기고, 기존 AI·SQLite 백엔드 기능을 연결한 개발용 앱입니다.
화면 구성과 이동은 최종 프로토타입을 따르며, 촬영·AI 인식·제품 등록·사진 저장·목록/상세 조회·수정·삭제는 실제 API를 사용합니다.

## 실행

```bash
npm ci
npx expo start          # QR 코드를 휴대폰의 Expo Go 앱으로 스캔
npx expo start --web    # 브라우저에서 바로 확인 (폭 375px로 보면 시안과 같음)
```

백엔드는 저장소 루트에서 먼저 실행합니다. 휴대폰에서는 `127.0.0.1` 대신 PC의 IPv4 주소를 사용하세요.

```powershell
$env:EXPO_PUBLIC_API_URL="http://PC의_IPv4주소:3001"
node .\backend\server.mjs
```

- Expo SDK 58 / React Native 0.88 / expo-router 기반입니다. 휴대폰에는 **최신 Expo Go**를 설치해 주세요.
- 사용한 네이티브 모듈은 모두 Expo Go에 포함되어 있어서 별도 빌드 없이 바로 실행됩니다.
- 처음 상태로 되돌리려면 앱 데이터를 지우세요(웹은 localStorage 삭제). 상태는 AsyncStorage `dasseum-app-v13` 키에 저장됩니다.

## 화면 ↔ 파일

| 프로토타입 | 경로 | 파일 |
|---|---|---|
| 0 스플래시 | `/` | `src/app/index.tsx` |
| 온보딩 | `/onboarding` | `src/app/onboarding.tsx` |
| 1 홈 (탭) | `/home` | `src/app/home.tsx` |
| 2 구매 전 확인 (탭) | `/check` | `src/app/check.tsx` |
| 3 사진으로 확인 · 제품 등록 촬영 | `/camera?purpose=register` | `src/app/camera.tsx` |
| 4 AI 확인 중 | `/analyzing?mode&q` | `src/app/analyzing.tsx` |
| 5 AI 확인 결과 | `/result?mode&q` | `src/app/result.tsx` |
| 6 보유 제품 상세 | `/product/[id]` | `src/app/product/[id].tsx` |
| 7 구매 보류 완료 | `/held?item` | `src/app/held.tsx` |
| 8 다씀 기록 | `/records?tab` | `src/app/records.tsx` |
| + 내 물품 (탭) | `/items` | `src/app/items.tsx` |
| + 먼저 써야 할 제품 | `/first` | `src/app/first.tsx` |
| + AI 인식 완료 (등록) | `/recognized` | `src/app/recognized.tsx` |
| + 제품 등록 완료 | `/registered` | `src/app/registered.tsx` |
| + 다씀 완료 | `/done/[id]` | `src/app/done/[id].tsx` |
| + 카메라 권한 안내 | `/camera-permission` | `src/app/camera-permission.tsx` |
| + 인식 실패 안내 | `/not-found` | `src/app/not-found.tsx` |
| + AI 제품 비교 | `/ai-analysis` | `src/app/ai-analysis.tsx` |
| + 사용기한 알림 | `/alerts` | `src/app/alerts.tsx` |
| + 설정 (탭) | `/settings` | `src/app/settings.tsx` |

```
src/
├─ app/            화면(expo-router). _layout.tsx = 폰트 로드 · Stack(페이드 250ms) · 토스트
├─ components/
│  ├─ ui.tsx       공통 컴포넌트: Button, Badge, Card, TopBar, IconBtn, ProdImg, Mascot, ActionArea …
│  ├─ shell.tsx    Screen(안전영역), 하단 탭, 토스트, nav.reset/back
│  ├─ Stamp.tsx    체크 도장 애니메이션(스플래시 · 등록 완료)
│  └─ DateField*.tsx  날짜 입력 (iOS/Android 피커 · 웹 input[type=date])
├─ data/products.ts  목업 제품 · 판정 규칙(matchQuery) · 초기 기록
├─ store/AppStore.tsx 앱 상태(검색어, 최근 확인, 구매 보류, 다씀, 개봉일) + AsyncStorage 저장
└─ theme/          tokens.ts(색 · 글꼴 · tx 타이포 규칙), icons.ts(Wanted DS 아이콘 SVG 경로)
```

## 테스트 시나리오 (프로토타입과 동일)

- 동일 제품 있음: `비타민D` 검색, 또는 사진으로 확인(항상 동일)
- 유사 제품 있음: `온데이 비타민D3 2000IU`
- 보유 제품 없음: `오메가3`
- 사진 확인 결과(동일/유사/없음)와 제품 등록 인식 실패(제품 사진/유통기한)는 **설정 > 개발자 옵션**에서 고릅니다. 프로토타입 오른쪽 테스트 패널을 대신하며 개발 빌드(`__DEV__`)에서만 보입니다. 같은 곳에 '처음 상태로 되돌리기'도 있습니다.
- 보유 제품 상세의 ⋮ 메뉴에서 수정·삭제할 수 있고, 다씀 완료 화면에서 5초 동안 되돌릴 수 있습니다.
- 홈 알림 아이콘과 하단 설정 탭은 실제 화면으로 이동합니다.
- 제품 등록을 완료하면 내 물품에 저장되며 앱을 다시 열어도 유지됩니다.

## 백엔드 연동할 곳

| 기능 | 지금(목업) | 바꿀 곳 |
|---|---|---|
| 제품 목록 · 상세 | `PRODUCTS` 상수 | `src/data/products.ts` → API |
| 검색 중복 확인 | `matchQuery()` 키워드 규칙, 1.7초 대기 | `analyzing.tsx`에서 API 호출 후 `result`로 이동 |
| 사진 중복 확인 · 제품 인식 · 유통기한 OCR | 실제 카메라/앨범 선택 후 개발자 옵션 값으로 판정 | `camera.tsx`의 `proceed()` (TODO(API) 주석) |
| 제품 수정 · 삭제 | 로컬 상태(`productEdits`, `completed`) | `AppStore.tsx`의 `updateProduct`, `deleteProduct` |
| 구매 보류 · 다씀 · 개봉일 | 로컬 상태(AsyncStorage) | `AppStore.tsx`의 `hold`, `markDone`, `openToday` |
| 제품 등록 | 로컬 상태와 내 물품 목록에 저장 | `AppStore.tsx`의 `registerProduct`를 API로 교체 |
| D-day · 추천 사유 | 고정값(기준일 2026-11-12) | 서버 또는 클라이언트 계산 |

## 시안과 다른 점 (의도적)

- **토스트 아이콘 자리**: 프로토타입 토스트 왼쪽의 점선 네모("Ratio")는 디자인 시스템 컴포넌트의 빈 아이콘 자리라 넣지 않았습니다. 글자 위치는 같습니다.
- **토스트 배경 블러**: RN에는 backdrop blur가 없어 블러된 밝은 배경을 단색으로 근사했습니다.
- **마스코트**: 프로토타입은 불투명 PNG를 `mix-blend-mode: multiply`로 배경에 섞습니다. 같은 결과가 모든 기기에서 나오도록 배경색(#F7FAF8)과 미리 합성한 PNG를 넣었습니다. 투명 배경 원본이 나오면 교체하세요(`assets/images/mascot`).
- **상태바 · 홈 인디케이터**: 프로토타입의 가짜 상태바(9:41) 대신 실제 기기의 안전영역을 씁니다.
- **'오늘 개봉했어요'**: 프로토타입은 화면을 나가면 초기화되지만, 앱에서는 저장해 내 물품의 '미개봉' 배지에도 반영됩니다.
- **날짜 입력**: 웹은 브라우저 date 입력, iOS/Android는 기본 날짜 피커를 씁니다. 표시 형식은 `2027. 11. 12.`입니다.
- **카메라 미리보기**: 촬영 버튼을 누르면 iOS/Android 기본 카메라가 열립니다. 촬영 후 AI 판정은 아직 목업입니다.
- **줄바꿈**: iOS와 웹은 어절 단위(keep-all)로 줄을 바꿉니다. Android는 OS 기본 규칙을 따라서, 긴 문장이 글자 단위로 끊길 수 있습니다.

## 글꼴

- 본문: Pretendard (SIL OFL) · `assets/fonts/Pretendard-*.otf`
- 로고 · 스플래시: The Jamsil (송파구 무료 글꼴, 시안 프로젝트에 포함된 라이선스 참고) · `assets/fonts/TheJamsil-*.ttf`
