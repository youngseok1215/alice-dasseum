// 프로토타입 go('camera'): 카메라 권한을 이미 허용했으면 바로 카메라, 아니면 권한 안내 화면
import { router } from 'expo-router';
import { useCallback } from 'react';
import { useApp } from '@/store/AppStore';

export function useOpenCamera() {
  const { cameraPermission } = useApp();
  return useCallback((purpose?: 'register', opts: { replace?: boolean } = {}) => {
    const pathname = cameraPermission === 'granted' ? '/camera' : '/camera-permission';
    const target = { pathname, params: purpose ? { purpose } : {} } as const;
    if (opts.replace) router.replace(target);
    else router.push(target);
  }, [cameraPermission]);
}
