import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, motion, shadow as shadowTokens, spacing, type } from '@/theme/tokens';

const character = require('../../assets/dasseum/character.png');
const logo = require('../../assets/dasseum/logo-mark.png');

export default function SplashRoute() {
  const [bob] = useState(() => new Animated.Value(0));
  const goHome = () => router.replace('/(tabs)' as Href);

  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: 1, duration: motion.bobDuration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(bob, { toValue: 0, duration: motion.bobDuration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
    ]));
    animation.start();
    const timer = setTimeout(goHome, motion.splashDuration);
    return () => { animation.stop(); clearTimeout(timer); };
  }, [bob]);

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable accessibilityRole="button" accessibilityLabel="홈으로 이동" onPress={goHome} style={styles.page}>
        <View style={styles.center}>
          <Animated.View style={{ transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) }, { rotate: bob.interpolate({ inputRange: [0, 1], outputRange: ['-1.5deg', '1.5deg'] }) }] }}>
            <Image source={character} contentFit="contain" style={styles.character} />
          </Animated.View>
          <Animated.View style={[styles.shadow, { opacity: bob.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.1] }), transform: [{ scaleX: bob.interpolate({ inputRange: [0, 1], outputRange: [1, 0.82] }) }] }]} />
          <View style={styles.logoRow}><Image source={logo} contentFit="contain" style={styles.logo} /><Text style={type.splashLogo}>다씀</Text></View>
          <Text style={[type.body, styles.tagline]}>있는 걸 먼저, 끝까지 다 쓰는 습관</Text>
          <View style={styles.dots}>{[0, 1, 2].map((i) => <View key={i} style={[styles.dot, { opacity: 1 - i * 0.2 }]} />)}</View>
        </View>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  page: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 },
  center: { alignItems: 'center', gap: spacing['7xl'] },
  character: { width: 250, height: 201 },
  // 납작한 막대 → 가운데가 진하고 가장자리가 퍼지는 흐린 타원
  shadow: { width: 140, height: 6, marginTop: -30, borderRadius: 999, ...shadowTokens.splash },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  logo: { width: 40, height: 38 },
  tagline: { color: colors.textSecondary, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: spacing.md },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
});
