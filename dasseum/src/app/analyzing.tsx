// 4. AI 확인 중 — 목업: 1.7초 후 결과로 교체 (실제: API 응답 시 이동)
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Alert, View } from 'react-native';
import { getPendingPhoto, recognizePhoto, setPendingSuggestion } from '@/api/products';
import { nav, Screen } from '@/components/shell';
import { ActionArea, DButton, Mascot, T } from '@/components/ui';
import { C, tx } from '@/theme/tokens';
import { useApp } from '@/store/AppStore';

export default function Analyzing() {
  const { mode = 'search', q = '' } = useLocalSearchParams<{ mode?: string; q?: string }>();
  const { refreshProducts } = useApp();
  useEffect(() => {
    if (mode === 'search') {
      const timer = setTimeout(() => router.replace({ pathname: '/result', params: { mode, q } }), 1700);
      return () => clearTimeout(timer);
    }

    const photo = getPendingPhoto();
    if (!photo) {
      Alert.alert('사진이 없어요', '사진을 다시 촬영하거나 선택해 주세요.');
      router.back();
      return;
    }

    const controller = new AbortController();
    recognizePhoto(photo, controller.signal)
      .then(async (suggestion) => {
        if (mode === 'register-photo') {
          setPendingSuggestion(suggestion);
          router.replace('/recognized');
        } else {
          await refreshProducts();
          router.replace({ pathname: '/result', params: { mode: 'photo', q: suggestion.name || '' } });
        }
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        Alert.alert('AI 인식에 실패했어요', error instanceof Error ? error.message : '직접 입력해 주세요.');
        if (mode === 'register-photo') router.replace('/recognized');
        else router.back();
      });
    return () => controller.abort();
  }, [mode, q, refreshProducts]);
  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, paddingHorizontal: 32 }}>
        <Mascot kind="search" size={160} />
        <View>
          <T style={[tx(20, 28, 700), { textAlign: 'center' }]}>내 물품과 비교하고 있어요</T>
          <T style={[tx(15, 22, 400, C.alt), { marginTop: 6, textAlign: 'center' }]}>
            {mode === 'photo' || mode === 'register-photo' ? '촬영한 사진' : `‘${q}’`}을 분석하는 중이에요
          </T>
        </View>
      </View>
      <ActionArea><DButton label="취소" variant="outlined" onPress={nav.back} /></ActionArea>
    </Screen>
  );
}
