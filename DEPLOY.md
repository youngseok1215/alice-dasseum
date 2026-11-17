# 다씀 배포·실행 가이드 (`feature/final-deployment`)

앱(`dasseum/`, Expo)과 백엔드(`backend/`, Node.js + SQLite)를 실행·배포하는 방법입니다.
API 키는 **백엔드 환경변수에만** 둡니다. 앱 번들에는 `EXPO_PUBLIC_API_URL`(서버 주소)만 들어갑니다.

## 1. 준비물

- Node.js **22.13 이상** (백엔드가 내장 `node:sqlite`를 사용합니다. 24 LTS 권장)
- 휴대폰: 최신 Expo Go (SDK 58)

## 2. 백엔드

### 환경변수

`backend/.env.example`을 `backend/.env`로 복사해서 채웁니다(`.env`는 커밋되지 않습니다).

| 변수 | 필수 | 설명 |
| --- | --- | --- |
| `GEMINI_API_KEY` | 필수 | 사진 제품 인식, 구매 전 유사 제품 분석. 없으면 두 기능이 503 |
| `KAKAO_REST_API_KEY` | 권장 | 인터넷 제품 사진 추천 |
| `GOOGLE_CLOUD_VISION_API_KEY` | 선택 | 카카오 키가 없을 때 사진 기반 유사 이미지 검색 |
| `DASSEM_HOST` | 선택 | 외부 접속은 `0.0.0.0`. 비우면 `127.0.0.1`, 단 `PORT`만 있는 배포 환경에서는 `0.0.0.0` |
| `DASSEM_PORT` | 선택 | 비우면 `PORT`, 그것도 없으면 `3001` |
| `DASSEM_DB_PATH` | 배포 시 필수 | SQLite 파일 경로. 사진은 같은 폴더의 `images/`에 저장 |
| `DASSEM_TIMEZONE` | 선택 | AI 판단 문구의 D-day·개봉 경과 계산 기준 시간대. 기본 `Asia/Seoul` |
| `DASSEM_AI_LIMIT_PER_USER` | 선택 | AI 요청(사진 인식·구매 분석·사진 검색) 사용자별 10분 한도. 기본 30 |
| `DASSEM_AI_LIMIT_PER_IP` | 선택 | 같은 IP의 AI 요청 10분 한도. 기본 120 |
| `DASSEM_SIGNUP_LIMIT_PER_IP` | 선택 | 같은 IP에서 1시간에 만들 수 있는 사용자 수. 기본 20 |
| `DASSEM_TRUST_PROXY` | 선택 | Render·Railway처럼 프록시 뒤에서 실행하면 `1` (실제 접속 IP로 요청 제한) |
| `DASSEM_CORS_ORIGINS` | 선택 | 웹 빌드 주소(쉼표 구분). 휴대폰 앱은 필요 없음 |

### 실행 (저장소 루트에서)

```powershell
# PowerShell — .env 파일 사용
node --env-file=backend/.env backend/server.mjs

# 또는 터미널에서 직접 지정
$env:DASSEM_HOST="0.0.0.0"
$env:DASSEM_PORT="3001"
$env:GEMINI_API_KEY = Read-Host "Gemini API 키"
node .\backend\server.mjs
```

시작 로그에서 다음을 확인합니다(키 값은 출력되지 않습니다).

```
[db] 기존 DB 사용: ...\products.sqlite
[db] 마이그레이션: products 테이블 최신 상태
[db] 제품 N개, 기록 N개
[config] GEMINI_API_KEY 설정됨 · KAKAO_REST_API_KEY 설정됨 · ...
Products API listening on 0.0.0.0:3001
```

> Windows 주의: 서버를 실행한 PowerShell 창 안을 마우스로 클릭하면 창 제목에 '선택'이 붙고 서버가 일시정지돼요(요청이 시간 초과로 실패). **Esc**를 누르면 다시 동작해요.
> 서버 로그의 `[req] POST /api/products/recognize 200 4.2s` 줄로 요청이 도착했는지와 걸린 시간을 확인할 수 있어요.

### 상태 확인

```powershell
curl http://<서버주소>:3001/api/health
```

```json
{ "status": "ok", "time": "...", "uptimeSeconds": 12,
  "database": { "connected": true }, "imageStorage": { "writable": true },
  "config": { "gemini": true, "kakao": true, "googleVision": false, "eliceVision": false } }
```

`config`에는 키 **설정 여부(true/false)만** 들어갑니다. DB에 연결할 수 없으면 HTTP 503을 반환합니다.

### 테스트

```powershell
node --test backend/test/api.test.mjs
```

임시 폴더에 새 DB를 만들어 검사하므로, 실제 `backend/.data` DB는 건드리지 않습니다.

## 3. 앱 (Expo)

`dasseum/.env.example`을 `dasseum/.env`로 복사하고 서버 주소를 넣습니다.

```
EXPO_PUBLIC_API_URL=http://192.168.0.10:3001   # 같은 Wi-Fi 테스트 (백엔드 PC의 IPv4)
EXPO_PUBLIC_API_URL=https://api.example.com    # 배포 서버
```

```powershell
cd .\dasseum
npm ci
npx.cmd tsc --noEmit
npx.cmd expo lint --no-cache
npx.cmd expo start
```

- `.env`를 바꾼 뒤에는 `npx.cmd expo start --clear`로 다시 시작해야 반영됩니다.
- Expo Go에서는 `http://` 주소로도 접속됩니다. **APK·IPA로 빌드한 앱**은 기본적으로 `http`를 막으므로 배포 서버는 `https`를 사용하세요.

## 4. 사용자 구분

로그인 없이 처음 실행할 때 **이름**만 입력합니다.
- 서버가 무작위 ID를 발급하고, 앱은 이 ID를 기기에 저장해서 모든 요청에 `X-Dasseum-User` 헤더로 보냅니다.
- 서버는 그 사용자의 제품·기록만 돌려주고, 다른 사용자의 제품은 조회·수정·삭제할 수 없습니다(404).
- 같은 이름을 써도 데이터는 섞이지 않습니다.
- 앱을 삭제하거나 휴대폰을 바꾸면 이전 데이터에 접근할 수 없습니다(복구 기능 없음).
- 사용자 구분을 넣기 전에 DB에 있던 제품·기록(`userId` 없음)은 지우지 않고 **아무에게도 보이지 않게** 보관합니다. 시작 로그에 개수가 표시됩니다.
- 서버 DB를 새로 만들면 기존 기기의 ID를 서버가 모르게 되고, 앱은 자동으로 이름 입력 화면으로 돌아갑니다.

API: `POST /api/users {name}` → `{ user: { id, name } }`, `GET/PATCH /api/users/me`

**요청 제한** (초과 시 `429`, `Retry-After` 헤더, 한국어 안내)
- AI 요청(사진 인식·구매 분석·사진 검색): 사용자별 10분에 30회, IP별 10분에 120회
- 사진 업로드·저장: 사용자별 10분에 60회
- 사용자 생성: IP별 1시간에 20명

## 5. 데이터 영속성 (중요)

모든 사용자 데이터는 두 곳에 있습니다.

- SQLite 파일: `DASSEM_DB_PATH` (기본 `backend/.data/products.sqlite`)
- 제품 사진: 같은 폴더의 `images/`

서버를 재시작하거나 재배포해도 이 폴더가 **그대로 남아 있어야** 데이터가 유지됩니다.

| 배포 환경 | 유지 여부 | 할 일 |
| --- | --- | --- |
| 연구실 서버, VPS, 개인 PC | 유지됨 | 저장소 밖 고정 경로 권장 (예: `/srv/dasseum/products.sqlite`) |
| Docker | 컨테이너를 지우면 사라짐 | 볼륨 마운트 후 `DASSEM_DB_PATH`를 볼륨 안으로 |
| Render·Railway·Fly.io 등 PaaS | 기본 파일시스템은 재배포 때 초기화되는 경우가 많음 | 영구 디스크/볼륨을 붙이고 그 경로로 지정. 불가능하면 외부 DB 필요 |

- 서버 시작 로그의 `[db] 새 DB 생성`이 재배포할 때마다 보인다면, 저장 위치가 임시 저장소라는 뜻입니다.
- 백엔드는 시작할 때 **기존 DB를 지우거나 초기화하지 않습니다.** 필요한 열·테이블만 추가합니다.
  - 추가 열: `brand`, `imageUri`, `status`, `completedAt`, `memo`
  - 추가 테이블: `activity_records`
- SQLite는 서버 **1대(인스턴스 1개)** 에서만 사용하세요. 여러 대로 늘리려면 외부 DB가 필요합니다.
- 배포 전 백업: 서버를 멈춘 뒤 DB 파일과 `images/` 폴더를 함께 복사합니다.

## 6. 안정성 동작 요약

- **외부 API 타임아웃·재시도:**
  - Gemini 인식 15초, 임베딩 10초, 판단 문구 12초, 카카오 8초
  - 5xx·네트워크 오류만 1회 재시도하고, 429(한도 초과)는 재시도하지 않음
  - 재시도는 코드상 최대 2회로 제한
- **앱 요청 타임아웃:**
  - 일반 15초, 사진 저장 30초, 사진 인식 75초, 구매 분석 100초 (서버 쪽 최악 처리 시간보다 길게)
  - 서버에 닿지 못하면 '보유 제품 없음' 결과로 넘어가지 않고 다시 시도를 안내
- **사진 정리:**
  - 제품 삭제나 사진 교체 시, 다른 제품이 쓰지 않는 로컬 사진만 삭제
  - 등록 실패로 24시간 넘게 어떤 제품에도 연결되지 않은 사진은 서버 시작 시와 12시간마다 정리
- **사진 업로드 크기:** 앱이 업로드 전에 긴 변 2048px, JPEG 0.8로 줄여서 보냄 (`expo-image-manipulator`)
- **외부 사진 다운로드:**
  - 내부 주소(localhost·사설 IP·링크로컬·메타데이터 주소) 차단, 리다이렉트마다 다시 검사
  - 5MB 스트리밍 제한, JPEG·PNG·WebP 파일 시그니처 확인
