// + 제품 등록 완료 — 명세 4-2항 "반드시 이대로"
// 원+체크 0.18→1배(0–0.45s) · 체크 그리기(0.4–0.8s) · 문구 상자(0.8–1.15s). 동작 줄이기 시 완성 상태만.
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { nav, Screen } from '@/components/shell';
import { CHECK_LEN, EASE_OUT, Stamp } from '@/components/Stamp';
import { ActionArea, DButton, T } from '@/components/ui';
import { C, tx } from '@/theme/tokens';

export default function Registered() {
  const reduce = useReducedMotion();
  const scale = useSharedValue(reduce ? 1 : 0.18);
  const dash = useSharedValue(reduce ? 0 : CHECK_LEN);
  const msg = useSharedValue(reduce ? 1 : 0);

  useEffect(() => {
    if (reduce) return;
    scale.value = withTiming(1, { duration: 450, easing: EASE_OUT });
    dash.value = withDelay(400, withTiming(0, { duration: 400, easing: EASE_OUT }));
    msg.value = withDelay(800, withTiming(1, { duration: 350, easing: EASE_OUT }));
  }, [reduce, scale, dash, msg]);

  const stampStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const msgStyle = useAnimatedStyle(() => ({ opacity: msg.value, transform: [{ translateY: (1 - msg.value) * 6 }] }));

  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28, paddingBottom: 40 }}>
        <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={stampStyle}><Stamp size={112} dash={dash} /></Animated.View>
        </View>
        <Animated.View style={[{ paddingVertical: 14, paddingHorizontal: 24, borderRadius: 999, backgroundColor: C.card }, msgStyle]}>
          <T style={tx(17, 24, 700)}>제품이 등록되었어요!</T>
        </Animated.View>
      </View>
      <ActionArea><DButton label="확인" onPress={() => nav.reset('/home')} /></ActionArea>
    </Screen>
  );
}
