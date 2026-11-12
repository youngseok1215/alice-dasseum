# 백엔드 명세 (backend-spec)

데이터 모델 제안입니다. 저장소 종류(RDB/문서형), 인증 방식은 미정입니다(open-questions).

## users
| 필드 | 타입 | 설명 |
|---|---|---|
| id | uuid | |
| created_at | timestamp | |
| auth_provider | string | 미정 (소셜 로그인 여부) |

## products (보유 제품)
| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| id | uuid | O | |
| user_id | uuid | O | |
| name | string | O | 제품명 |
| brand | string | | |
| category | enum(cosmetic, supplement, medicine, household) | O | 화장품·영양제·의약품·생활용품 |
| image_url | string | | 등록 사진 |
| opened_at | date | | null = 미개봉 |
| expires_at | date | | 제품 표기 사용기한. null = 미입력 |
| pao_months | int | | 개봉 후 사용기간 (PRD 제안 · 미확정) |
| memo | string | | |
| status | enum(owned, done) | O | |
| completed_at | timestamp | | 다씀 처리일 |
| source | enum(ai, manual) | O | 등록 방식 |
| ai_fields | string[] | | AI가 채운 필드 목록(수정률 분석용) |
| created_at / updated_at | timestamp | O | |

계산 값(dday, recommend_reason, sort_rank)은 서버 계산 또는 클라이언트 계산 중 선택(미정). 사용 순서 규칙: 기한 지남 → 사용기한 임박순 → 같은 기한이면 개봉 제품 우선 → 개봉일 오래된 순.
잔량 필드는 만들지 않습니다(기획 조건).

## hold_records (구매 보류 기록)
| 필드 | 타입 | 설명 |
|---|---|---|
| id | uuid | |
| user_id | uuid | |
| check_id | uuid | 어떤 중복 확인에서 생겼는지 |
| query_text | string | 검색어 또는 인식된 제품명 |
| input_mode | enum(search, photo) | |
| verdict | enum(same, similar) | |
| matched_product_id | uuid | 보유 제품 |
| created_at | timestamp | |

## done_records (다씀 완료 기록)
products.status=done + completed_at으로 대체 가능. 제품 삭제 후에도 기록을 남길지에 따라 별도 테이블 여부 결정(미정).
| 필드 | 타입 |
|---|---|
| id, user_id, product_id | uuid |
| product_name, category | string, enum (스냅샷) |
| completed_at | timestamp |

## duplicate_checks / recent_checks (최근 확인)
| 필드 | 타입 | 설명 |
|---|---|---|
| id | uuid | check_id |
| user_id | uuid | |
| input_mode | enum(search, photo) | |
| query_text | string | |
| image_url | string | 사진 확인 시 (보관 기간 미정) |
| verdict | enum(same, similar, none) | |
| matched_product_ids | uuid[] | |
| user_decision | enum(hold, buy, none, pending) | 구매 보류 / 그래도 구매 / 없음 확인 |
| created_at | timestamp | |
최근 확인 목록 = 최근 search 5건(중복 제거). 개별 삭제는 숨김 처리.

## notification_settings (알림 설정)
| 필드 | 타입 | 기본값 | 상태 |
|---|---|---|---|
| user_id | uuid | | |
| expiry_alert_enabled | bool | true | MVP |
| threshold_days | int | 30 | 제안(7/14/30/60) |
| alert_time | time | 미정 | 제안 |
| push_token | string | | 기기별 |

## 오류·지연 처리 공통
- 응답 형식: `{ "error": { "code": "STRING", "message": "사용자 표시용 해요체 문구" } }`
- 중복 확인 10초 초과 → 클라이언트 타임아웃, "연결이 원활하지 않아요" + [다시 시도]
- AI 인식 실패 → 200 + `verdict: null`, `reason` 코드 (ai-requirements 참고)
- 등록 중 실패 → 입력값 클라이언트에 유지
