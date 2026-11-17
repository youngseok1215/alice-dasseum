// 서버 요청 중 같은 버튼을 다시 눌러도 요청이 한 번만 가도록 막는 훅.
// ref로 즉시 잠그기 때문에 상태 반영 전의 빠른 연속 탭도 막습니다.
import { useCallback, useRef, useState } from 'react';

export function useBusy() {
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (work: () => Promise<void>) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    try {
      await work();
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }, []);
  return [busy, run] as const;
}
