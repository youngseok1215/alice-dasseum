// 현재 사용자 ID (서버가 발급한 무작위 ID). 모든 API 요청에 X-Dasseum-User 헤더로 붙습니다.
// 로그인은 없고, ID는 기기(AsyncStorage)에만 저장됩니다.

let currentUserId: string | undefined;
let onUserRejected: (() => void) | undefined;

export function setSessionUser(id: string | undefined) {
  currentUserId = id;
}

export function getSessionUser() {
  return currentUserId;
}

/** 서버가 이 ID를 모를 때(401 USER_REQUIRED) 호출할 함수 — 저장된 사용자를 지우고 이름 입력 화면으로 보냄 */
export function setUserRejectedHandler(handler: (() => void) | undefined) {
  onUserRejected = handler;
}

export function notifyUserRejected() {
  onUserRejected?.();
}
