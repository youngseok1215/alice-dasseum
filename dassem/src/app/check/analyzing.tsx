import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Mascot } from '@/components/prototype-ui';
import { Screen } from '@/components/screen';
import { addRecent } from '@/data/app-store';
import { colors, fonts, type } from '@/theme/tokens';

export default function AnalyzingScreen() {
  const { q = '제품', purpose = 'check', mode = 'search' } = useLocalSearchParams<{ q?: string; purpose?: string; mode?: string }>();
  const photo = mode === 'photo';
  useEffect(() => { if (!photo) addRecent(q); const timer = setTimeout(() => router.replace({ pathname: '/check/result', params: { q, purpose, mode } }), 1700); return () => clearTimeout(timer); }, [mode, photo, purpose, q]);
  return <Screen scroll={false}><View style={styles.page}>
    <View style={styles.center}><Mascot kind="search" size={160} /><View style={styles.copy}><Text style={styles.title}>내 물품과 비교하고 있어요</Text><Text style={styles.sub}>{photo ? '촬영한 사진' : `‘${q}’`}과 같거나 비슷한 제품을 찾는 중이에요</Text></View></View>
    <View style={styles.action}><Pressable onPress={() => router.back()} style={styles.cancel}><Text style={styles.cancelText}>취소</Text></Pressable></View>
  </View></Screen>;
}
const styles = StyleSheet.create({ page: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, paddingHorizontal: 12 }, copy: { alignItems: 'center' }, title: { ...type.resultTitle, fontFamily: fonts.bold }, sub: { ...type.body, fontSize: 15, lineHeight: 22, color: colors.textSecondary, fontFamily: fonts.medium, textAlign: 'center', marginTop: 6 }, action: { paddingTop: 12, paddingBottom: 8 }, cancel: { height: 52, borderRadius: 14, borderWidth: 1, borderColor: '#D7DBD9', alignItems: 'center', justifyContent: 'center' }, cancelText: { ...type.button, fontFamily: fonts.bold } });
