import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { clearRecognitionPhoto, getRecognitionPhoto, recognizePhoto } from '@/api/product-vision';
import { Mascot } from '@/components/prototype-ui';
import { Screen } from '@/components/screen';
import { addRecent } from '@/data/app-store';
import { colors, fonts, type } from '@/theme/tokens';

export default function AnalyzingScreen() {
  const { q = '제품', purpose = 'check', mode = 'search' } = useLocalSearchParams<{ q?: string; purpose?: string; mode?: string }>();
  const photo = mode === 'photo';
  const [image] = useState(() => photo ? getRecognitionPhoto() : undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!photo) {
      addRecent(q);
      const timer = setTimeout(() => router.replace({ pathname: '/check/result', params: { q, purpose, mode } }), 1700);
      return () => clearTimeout(timer);
    }
    if (!image) return;

    const controller = new AbortController();
    recognizePhoto(image, controller.signal).then((suggestion) => {
      if (controller.signal.aborted) return;
      if (!suggestion.name) {
        setError('제품명을 읽지 못했어요. 제품 이름이 잘 보이게 다시 찍어 주세요.');
        return;
      }
      router.replace({
        pathname: '/check/result',
        params: {
          q: suggestion.name, purpose, mode,
          brand: suggestion.brand ?? '',
          category: suggestion.category ?? '',
          expiresAt: suggestion.expiresAt ?? '',
        },
      });
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : '사진 인식에 실패했어요.');
      }
    });

    return () => {
      controller.abort();
      clearRecognitionPhoto(image);
    };
  }, [image, mode, photo, purpose, q]);

  const failure = error || (photo && !image ? '선택한 사진이 없어요. 사진을 다시 선택해 주세요.' : '');
  const title = failure ? '사진을 확인할 수 없어요' : photo ? '사진에서 제품 정보를 읽고 있어요' : '내 물품과 비교하고 있어요';
  const subtitle = failure || (photo ? '제품 이름과 라벨을 확인하는 중이에요' : `‘${q}’과 같거나 비슷한 제품을 찾는 중이에요`);
  return <Screen scroll={false}><View style={styles.page}>
    <View style={styles.center}><Mascot kind="search" size={160} /><View style={styles.copy}><Text style={styles.title}>{title}</Text><Text style={styles.sub}>{subtitle}</Text></View></View>
    <View style={styles.action}><Pressable onPress={() => router.back()} style={styles.cancel}><Text style={styles.cancelText}>{failure ? '다시 시도' : '취소'}</Text></Pressable></View>
  </View></Screen>;
}
const styles = StyleSheet.create({ page: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, paddingHorizontal: 12 }, copy: { alignItems: 'center' }, title: { ...type.resultTitle, fontFamily: fonts.bold }, sub: { ...type.body, fontSize: 15, lineHeight: 22, color: colors.textSecondary, fontFamily: fonts.medium, textAlign: 'center', marginTop: 6 }, action: { paddingTop: 12, paddingBottom: 8 }, cancel: { height: 52, borderRadius: 14, borderWidth: 1, borderColor: '#D7DBD9', alignItems: 'center', justifyContent: 'center' }, cancelText: { ...type.button, fontFamily: fonts.bold } });
