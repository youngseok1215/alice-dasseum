# 다씀 앱

현재 실행 대상인 Expo SDK 58·React Native 앱입니다. 제품과 활동 기록은 `../backend/`의 실제 API와 SQLite를 사용합니다.

서버 준비와 환경파일 설정은 [저장소 실행 안내](../README.md#실행)를 따릅니다. 이 폴더에서 `npm ci` 후 `npx.cmd expo start`로 실행합니다. `EXPO_PUBLIC_API_URL`은 앱을 시작하는 환경에 설정해야 합니다.

## 화면과 코드

| 화면 | 경로 | 주요 파일 |
| --- | --- | --- |
| 이름 등록·수정 | `/profile` | `src/app/profile.tsx` |
| 홈·내 물품 | `/home`, `/items` | `src/app/home.tsx`, `src/app/items.tsx` |
| 제품 등록 방식 선택 | `/register-method` | `src/app/register-method.tsx` |
| 카메라·인식 결과 | `/camera`, `/recognized` | `src/app/camera.tsx`, `src/app/recognized.tsx` |
| 등록 완료 | `/registered` | `src/app/registered.tsx` |
| 구매 전 확인·판정 | `/check`, `/analyzing`, `/result` | `src/app/check.tsx`, `src/app/analyzing.tsx`, `src/app/result.tsx` |
| AI 구매 분석 | `/ai-analysis` | `src/app/ai-analysis.tsx` |
| 제품 상세·다씀 | `/product/[id]`, `/done/[id]` | `src/app/product/[id].tsx`, `src/app/done/[id].tsx` |
| 구매 보류·활동 기록 | `/held`, `/records` | `src/app/held.tsx`, `src/app/records.tsx` |
| 사용기한별 목록 | `/alerts`, `/first` | `src/app/alerts.tsx`, `src/app/first.tsx` |
| 설정 | `/settings` | `src/app/settings.tsx` |

## 데이터와 API

- `src/api/client.ts`에서 서버 주소·요청 시간 제한·오류·사용자 ID 헤더를 처리합니다.
- `src/api/products.ts`에서 제품·사진·AI 구매 분석·기록 API를 호출합니다.
- `src/api/users.ts`와 `src/api/session.ts`에서 사용자 생성과 기기 세션을 관리합니다.
- `src/store/AppStore.tsx`에서 서버 제품·기록을 불러오고 등록·수정·삭제·다씀·구매 보류를 반영합니다.
- `src/data/products.ts`에는 화면용 타입·날짜 계산·초기 상태가 있습니다. 초기 보유 제품은 비어 있습니다.
- 서버에 연결할 수 없으면 오류와 재시도 안내를 표시합니다.
- 개발 모드에는 테스트용 상태 선택 UI가 남아 있습니다. 실제 판정은 서버의 응답을 확인해야 합니다.

## 검사

```powershell
npx.cmd tsc --noEmit
npm run lint -- --no-cache
npx.cmd expo export --platform web
```

기기 촬영 권한과 실제 AI 인식은 서버·API 키를 준비한 뒤 휴대폰에서 확인합니다.

데이터 처리와 현재 제한은 [루트 README](../README.md#현재-제한과-데이터-처리), 글꼴·아이콘은 [자산 출처](../THIRD_PARTY_NOTICES.md)를 참고하세요.
