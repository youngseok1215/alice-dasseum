// + 다씀 완료 — 5초 동안 '되돌리기' 스낵바 표시
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, View } from 'react-native';
import { nav, Screen, useToast } from '@/components/shell';
import { ActionArea, Card, DBadge, DButton, Mascot, Press, ProdImg, T } from '@/components/ui';
import { TODAY } from '@/data/products';
import { useApp } from '@/store/AppStore';
import { C, ND, tx } from '@/theme/tokens';

export default function Done() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const { product, dones, undoDone } = useApp();
  const toast = useToast();
  const p = product(id || 'vitd');
  const [snack, setSnack] = useState(true);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 250, easing: Easing.bezier(0.2, 0, 0, 1), useNativeDriver: ND }).start();
    const t = setTimeout(() => setSnack(false), 5000);
    return () => clearTimeout(t);
  }, [fade]);

  // 프로토타입 onUndo: 기록을 되돌리고 상세 화면으로 복귀
  const onUndo = async () => {
    try {
      await undoDone(p.id);
      router.replace({ pathname: '/product/[id]', params: { id: p.id, ...(from ? { from } : {}) } });
      toast('다씀 기록을 되돌렸어요');
    } catch (error) {
      Alert.alert('기록을 되돌리지 못했어요', error instanceof Error ? error.message : '다시 시도해 주세요.');
    }
  };
  // 프로토타입 onConfirm: 확인 결과에서 들어왔으면 내 물품 탭으로, 아니면 이전 목록으로
  const onConfirm = () => (from === 'result' ? nav.reset('/items') : nav.back());

  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}>
        <Mascot kind="done" size={220} />
        <T style={[tx(24, 32, 700), { marginTop: 8, textAlign: 'center' }]}>다 쓴 제품으로 기록했어요</T>
        <T style={[tx(15, 22, 400, C.alt), { marginTop: 6, textAlign: 'center' }]}>있는 걸 먼저, 끝까지 다 썼어요.</T>
        <Card style={{ width: '100%', marginTop: 28, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <ProdImg size={48} radius={10} uri={p.imageUri} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <T style={tx(13, 18, 400, C.alt)}>{p.cat} · {TODAY} 다씀</T>
            <T numberOfLines={1} style={tx(15, 22, 500)}>{p.name}</T>
          </View>
          <DBadge tone="mint">다씀</DBadge>
        </Card>
        <Card style={{ width: '100%', marginTop: 10, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T style={tx(14, 20, 600, C.neutral)}>지금까지 다 쓴 제품</T>
          <T style={tx(17, 24, 700)}>{dones.length}개</T>
        </Card>
      </View>
      <ActionArea>
        {snack && (
          <Animated.View style={{ opacity: fade, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingLeft: 16, paddingRight: 12, borderRadius: 12, backgroundColor: '#2E2F33', marginBottom: 4 }}>
            <T style={[tx(14, 20, 500, '#FFFFFF'), { flex: 1 }]}>다 쓴 제품으로 기록했어요</T>
            <Press onPress={onUndo} radius={8} accessibilityLabel="되돌리기" style={{ paddingVertical: 6, paddingHorizontal: 8 }}>
              <T style={tx(14, 20, 700, C.mint)}>되돌리기</T>
            </Press>
          </Animated.View>
        )}
        <DButton label="확인" onPress={onConfirm} />
        <DButton label="다씀 기록 보기" variant="outlined" onPress={() => router.push({ pathname: '/records', params: { tab: 'done' } })} />
      </ActionArea>
    </Screen>
  );
}
