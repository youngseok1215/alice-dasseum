// 4. AI 확인 중 — 목업: 1.7초 후 결과로 교체 (실제: API 응답 시 이동)
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { nav, Screen, useTimeout } from '@/components/shell';
import { ActionArea, DButton, Mascot, T } from '@/components/ui';
import { C, tx } from '@/theme/tokens';

export default function Analyzing() {
  const { mode = 'search', q = '' } = useLocalSearchParams<{ mode?: string; q?: string }>();
  useTimeout(() => router.replace({ pathname: '/result', params: { mode, q } }), 1700);
  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, paddingHorizontal: 32 }}>
        <Mascot kind="search" size={160} />
        <View>
          <T style={[tx(20, 28, 700), { textAlign: 'center' }]}>내 물품과 비교하고 있어요</T>
          <T style={[tx(15, 22, 400, C.alt), { marginTop: 6, textAlign: 'center' }]}>
            {mode === 'photo' ? '촬영한 사진' : `‘${q}’`}과 같거나 비슷한 제품을 찾는 중이에요
          </T>
        </View>
      </View>
      <ActionArea><DButton label="취소" variant="outlined" onPress={nav.back} /></ActionArea>
    </Screen>
  );
}
