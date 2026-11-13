// + 제품 등록 완료 — 체크 도장 애니메이션
import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { nav, Screen } from '@/components/shell';
import { Stamp } from '@/components/Stamp';
import { ActionArea, DButton, T } from '@/components/ui';
import { C, ND, tx } from '@/theme/tokens';

const E = Easing.bezier(0.2, 0, 0, 1);

export default function Registered() {
  const scale = useRef(new Animated.Value(0.18)).current;
  const dash = useRef(new Animated.Value(74)).current;
  const msg = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, { toValue: 1, duration: 450, easing: E, useNativeDriver: ND }),
      Animated.sequence([Animated.delay(400), Animated.timing(dash, { toValue: 0, duration: 400, easing: E, useNativeDriver: false })]),
      Animated.sequence([Animated.delay(800), Animated.timing(msg, { toValue: 1, duration: 350, easing: E, useNativeDriver: ND })]),
    ]).start();
  }, [scale, dash, msg]);

  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28, paddingBottom: 40 }}>
        <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ transform: [{ scale }] }}><Stamp size={112} dash={dash} /></Animated.View>
        </View>
        <Animated.View style={{ opacity: msg, transform: [{ translateY: msg.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }], paddingVertical: 14, paddingHorizontal: 24, borderRadius: 999, backgroundColor: C.card }}>
          <T style={tx(17, 24, 700)}>제품이 등록되었어요!</T>
        </Animated.View>
      </View>
      <ActionArea><DButton label="확인" onPress={() => nav.reset('/home')} /></ActionArea>
    </Screen>
  );
}
