import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mascot } from '@/components/prototype-ui';
import { colors, fonts, motion, type } from '@/theme/tokens';

export default function SplashRoute() {
  const go = () => router.replace('/(tabs)');
  useEffect(() => { const timer = setTimeout(go, motion.splashDuration); return () => clearTimeout(timer); }, []);
  return <SafeAreaView style={styles.safe}><Pressable onPress={go} style={styles.page}>
    <Mascot kind="smile" size={180} />
    <View style={styles.copy}><Text style={styles.logo}>다씀.</Text><Text style={styles.tagline}>있는 걸 먼저, 끝까지 다 쓰는 습관</Text></View>
  </Pressable></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, page: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 }, copy: { alignItems: 'center', gap: 7 }, logo: { ...type.splashLogo, fontSize: 40, color: colors.deep, fontFamily: fonts.extrabold }, tagline: { ...type.bodySm, color: colors.textSecondary } });
