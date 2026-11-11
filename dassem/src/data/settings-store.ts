// 설정 값 저장소 — 설정 탭과 알림 상세 화면이 같은 값을 공유합니다.
// 지금은 앱 메모리에만 저장돼요. 영구 저장(AsyncStorage 등)이나 서버 동기화는 팀에서 정한 뒤 이 파일만 바꾸면 됩니다.
import { useSyncExternalStore } from 'react';

export type SimilarityLevel = 'strict' | 'normal' | 'loose';
export type NotifyTime = 'morning' | 'noon' | 'evening';

export type Settings = {
  expiryAlert: boolean;        // 유통기한 임박 알림
  duplicateWarning: boolean;   // 중복 구매 경고
  aiAutofill: boolean;         // 사진 인식 후 자동 입력
  similarity: SimilarityLevel; // 비슷한 제품 판단 기준
  expiryDays: number[];        // 유통기한 알림 시점 (D-n)
  notifyTime: NotifyTime;      // 알림 받을 시간
  openedAlert: boolean;        // 개봉 후 사용기한 알림
  orderAlert: boolean;         // 사용 순서 추천 알림
  monthlyReport: boolean;      // 월간 절약 리포트
  quietHours: boolean;         // 밤에는 알림 끄기 (22:00 ~ 08:00)
};

export const EXPIRY_DAY_OPTIONS = [3, 7, 14, 30, 60] as const;

export const NOTIFY_TIMES: { id: NotifyTime; label: string; time: string }[] = [
  { id: 'morning', label: '아침', time: '오전 9:00' },
  { id: 'noon', label: '점심', time: '오후 12:30' },
  { id: 'evening', label: '저녁', time: '오후 7:00' },
];

export const SIMILARITY_OPTIONS: { id: SimilarityLevel; label: string; hint: string }[] = [
  { id: 'strict', label: '엄격', hint: '제품명과 용량이 같을 때만 중복으로 알려줘요' },
  { id: 'normal', label: '보통', hint: '같은 종류의 제품이면 용량이 달라도 알려줘요' },
  { id: 'loose', label: '넓게', hint: '같은 카테고리의 비슷한 용도까지 모두 알려줘요' },
];

let state: Settings = {
  expiryAlert: true,
  duplicateWarning: true,
  aiAutofill: true,
  similarity: 'normal',
  expiryDays: [7, 30],
  notifyTime: 'morning',
  openedAlert: true,
  orderAlert: true,
  monthlyReport: false,
  quietHours: true,
};

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function updateSettings(patch: Partial<Settings>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

export function toggleExpiryDay(day: number) {
  const days = state.expiryDays.includes(day) ? state.expiryDays.filter((d) => d !== day) : [...state.expiryDays, day];
  updateSettings({ expiryDays: days });
}

export function useSettings() {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

// "D-30, D-7" 처럼 큰 수부터
export function formatExpiryDays(days: number[]) {
  return days.toSorted((a, b) => b - a).map((d) => `D-${d}`).join(', ');
}
