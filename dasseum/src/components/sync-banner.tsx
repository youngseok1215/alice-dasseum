// 서버에서 제품·기록을 불러오지 못했을 때 보여주는 안내 + 다시 시도 버튼
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Press, T } from '@/components/ui';
import { useApp } from '@/store/AppStore';
import { C, tx } from '@/theme/tokens';

export function SyncBanner({ style }: { style?: object }) {
  const { syncError, refreshProducts } = useApp();
  const [retrying, setRetrying] = useState(false);
  if (!syncError) return null;
  const retry = async () => {
    if (retrying) return;
    setRetrying(true);
    try { await refreshProducts(); } catch { /* 문구는 syncError로 갱신됨 */ } finally { setRetrying(false); }
  };
  return (
    <View accessibilityRole="alert" style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, backgroundColor: '#FFF1F0' }, style]}>
      <T style={[tx(14, 20, 500, C.red40), { flex: 1 }]}>{syncError}</T>
      <Press onPress={retry} radius={8} accessibilityLabel="다시 시도" style={{ paddingVertical: 6, paddingHorizontal: 10, backgroundColor: C.white, minWidth: 72, alignItems: 'center' }}>
        {retrying ? <ActivityIndicator size="small" color={C.red40} /> : <T style={tx(14, 20, 700, C.red40)}>다시 시도</T>}
      </Press>
    </View>
  );
}
