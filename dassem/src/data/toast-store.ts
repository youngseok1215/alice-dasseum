// 완료 토스트 — 어느 화면에서든 showToast()를 부르면 하단 탭 위에 잠깐 떠요.
import { useSyncExternalStore } from 'react';

import { motion } from '@/theme/tokens';

export type ToastMessage = { title: string; sub?: string };

let current: ToastMessage | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function showToast(message: ToastMessage) {
  clearTimeout(timer);
  current = message;
  emit();
  timer = setTimeout(() => {
    current = null;
    emit();
  }, motion.toastDuration);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useToast() {
  return useSyncExternalStore(subscribe, () => current, () => current);
}
