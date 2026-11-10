import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { colors, type } from '@/theme/tokens';

export default function SettingsScreen() {
  return <Screen><View style={styles.header}><Text style={type.screenTitle}>설정</Text></View><View style={styles.empty}><Text style={type.cardTitle}>설정 화면 준비 중</Text><Text style={[type.bodySm, styles.muted]}>디자인이 전달되면 이 자리에 연결해요.</Text></View></Screen>;
}

const styles = StyleSheet.create({ header: { height: 56, justifyContent: 'center' }, empty: { paddingVertical: 72, alignItems: 'center', gap: 6 }, muted: { color: colors.textTertiary } });
