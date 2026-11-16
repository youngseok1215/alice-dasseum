import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Alert, View } from 'react-native';
import {
  getPendingExpiryPhoto,
  getPendingPhoto,
  getPendingSuggestion,
  recognizePhoto,
  setPendingSuggestion,
} from '@/api/products';
import { nav, Screen } from '@/components/shell';
import { ActionArea, DButton, Mascot, T } from '@/components/ui';
import { useApp } from '@/store/AppStore';
import { C, tx } from '@/theme/tokens';

export default function Analyzing() {
  const { mode = 'search', q = '', album } = useLocalSearchParams<{ mode?: string; q?: string; album?: string }>();
  const { refreshProducts } = useApp();

  useEffect(() => {
    if (mode === 'search') {
      const timer = setTimeout(() => router.replace({ pathname: '/result', params: { mode, q } }), 900);
      return () => clearTimeout(timer);
    }

    const photo = mode === 'register-expiry' ? getPendingExpiryPhoto() : getPendingPhoto();
    if (!photo) {
      Alert.alert('사진이 없어요', '사진을 다시 촬영하거나 선택해 주세요.');
      router.back();
      return;
    }

    const controller = new AbortController();
    recognizePhoto(photo, controller.signal)
      .then(async (suggestion) => {
        if (mode === 'register-product') {
          setPendingSuggestion(suggestion);
          router.replace({ pathname: '/camera', params: { purpose: 'register', step: 'expiry' } });
          return;
        }
        if (mode === 'register-expiry') {
          const current = getPendingSuggestion();
          setPendingSuggestion({
            name: current?.name ?? suggestion.name,
            brand: current?.brand ?? suggestion.brand,
            category: current?.category ?? suggestion.category,
            expiresAt: suggestion.expiresAt ?? current?.expiresAt ?? null,
          });
          router.replace({ pathname: '/recognized', params: { expShot: '1' } });
          return;
        }
        await refreshProducts().catch(() => {});
        const query = [suggestion.brand, suggestion.name].filter(Boolean).join(' ');
        router.replace({ pathname: '/result', params: { mode: 'photo', q: query, ...(album ? { album } : {}) } });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        Alert.alert('AI 인식에 실패했어요', error instanceof Error ? error.message : '다시 시도해 주세요.');
        if (mode === 'register-expiry') router.replace({ pathname: '/recognized', params: { expShot: '0' } });
        else if (mode === 'register-product') router.replace({ pathname: '/not-found', params: { stage: 'product' } });
        else router.back();
      });
    return () => controller.abort();
  }, [album, mode, q, refreshProducts]);

  const registration = mode === 'register-product' || mode === 'register-expiry';
  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, paddingHorizontal: 32 }}>
        <Mascot kind="search" size={160} />
        <View>
          <T style={[tx(20, 28, 700), { textAlign: 'center' }]}>
            {registration ? '사진에서 제품 정보를 읽고 있어요' : '내 물품과 비교하고 있어요'}
          </T>
          <T style={[tx(15, 22, 400, C.alt), { marginTop: 6, textAlign: 'center' }]}>
            {mode === 'register-expiry'
              ? '유통기한 날짜를 확인하는 중이에요'
              : mode === 'register-product'
                ? '제품명과 브랜드, 카테고리를 찾는 중이에요'
                : mode === 'photo'
                  ? (album === '1' ? '앨범 사진' : '촬영한 사진') + '을 분석하는 중이에요'
                  : `‘${q}’과 같거나 비슷한 제품을 찾는 중이에요`}
          </T>
        </View>
      </View>
      <ActionArea><DButton label="취소" variant="outlined" onPress={nav.back} /></ActionArea>
    </Screen>
  );
}

