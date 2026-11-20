import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from '@/components/shell';
import { AppStoreProvider, useApp } from '@/store/AppStore';
import { C } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  // 프로토타입 body 스타일: 한국어 어절 단위 줄바꿈, 스크롤바 숨김
  const s = document.createElement('style');
  s.textContent = '*{word-break:keep-all;-webkit-font-smoothing:antialiased}*::-webkit-scrollbar{display:none}*{scrollbar-width:none}input{outline:none}';
  document.head.appendChild(s);
}

function Root() {
  const { ready } = useApp();
  const [fontsLoaded] = useFonts({
    'Pretendard-Regular': require('../../assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-Medium': require('../../assets/fonts/Pretendard-Medium.otf'),
    'Pretendard-SemiBold': require('../../assets/fonts/Pretendard-SemiBold.otf'),
    'Pretendard-Bold': require('../../assets/fonts/Pretendard-Bold.otf'),
    'Pretendard-ExtraBold': require('../../assets/fonts/Pretendard-ExtraBold.otf'),
    'TheJamsil-ExtraBold': require('../../assets/fonts/TheJamsil-ExtraBold.ttf'),
    'TheJamsil-Medium': require('../../assets/fonts/TheJamsil-Medium.ttf'),
  });
  const loaded = fontsLoaded && ready;
  useEffect(() => { if (loaded) SplashScreen.hideAsync().catch(() => {}); }, [loaded]);
  if (!loaded) return null;
  return (
    <ToastProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'fade', animationDuration: 250, contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="home" options={{ gestureEnabled: false }} />
        <Stack.Screen name="camera" options={{ contentStyle: { backgroundColor: C.dark } }} />
        <Stack.Screen name="analyzing" options={{ gestureEnabled: false }} />
        <Stack.Screen name="registered" options={{ gestureEnabled: false }} />
      </Stack>
    </ToastProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppStoreProvider>
        <Root />
      </AppStoreProvider>
    </SafeAreaProvider>
  );
}
