> 이전 디자인 자료입니다. 현재 실행 앱은 `../dasseum/`입니다.

# 화면용 이미지

## 마스코트 (`../character/`)
| 파일 | 버전 | 사용 화면 | 표시 크기 | 원본 크기 | 투명 배경 |
|---|---|---|---|---|---|
| mascot-smile.png | 기본 미소 | 스플래시, 홈 | 180 / 140 | 340×454 | **필요** (흰 배경) |
| mascot-search.png | 검색 | AI 확인 중 | 160 | 370×454 | **필요** (흰 배경) |
| mascot-hold.png | 구매 보류 | 구매 보류 완료 | 180 | 1254×1254 | **필요** (흰 배경) |
| mascot-done.png | 다씀 완료 | 다씀 완료 | 220 | 360×454 | **필요** (흰 배경) |
| source-mascot-sheet.png | 원본 3종 시트 | – | – | 1191×454 | 참고용 |

- 네 파일 모두 **불투명 PNG**입니다. 웹 프로토타입은 `mix-blend-mode: multiply`로 배경을 숨겼지만 React Native에는 이 기능이 없어 #F7FAF8 배경 위에 흰 사각형이 보입니다. **투명 배경 PNG(@2x, @3x, 최소 720×720) 원본이 필요합니다.**
- smile/search/done은 원본 시트에서 잘라낸 것이라 해상도가 낮습니다. 원본 파일로 교체를 권장합니다.
- 마스코트의 형태·색·비율 변경, AI 재생성 금지 (PRD 10.5).
- 권장 파일명(교체 시): `mascot_smile@2x.png`, `mascot_smile@3x.png` …

## 제품 이미지
- 프로토타입은 모두 플레이스홀더(크림 배경 + 이미지 아이콘)입니다. 실제로는 등록 시 촬영한 사진(`image_url`)을 씁니다.

## 아이콘
- Wanted DS 아이콘 사용: home, search, storage, setting, bell, camera, image, history, close, circleCloseFill, chevronLeft, chevronRight, moreVertical, circleInfo
- RN에서는 SVG로 가져오거나(react-native-svg) 유사한 라운드 아이콘 세트로 대체합니다(open-questions).
