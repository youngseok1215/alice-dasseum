import { router, type Href, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Screen, TopBar } from '@/components/screen';
import { findSimilarProducts, productStatus } from '@/data/mock-products';
import { AiBanner, Badge, Button, Card, StatusTag, Thumb } from '@/theme/components';
import { colors, spacing, type } from '@/theme/tokens';

export default function ResultScreen() {
  const params = useLocalSearchParams<{ from?: 'register' | 'search'; q?: string }>();
  const from = params.from ?? 'search';
  const query = params.q?.trim() || '제품';
  const matches = findSimilarProducts(query);
  const hasItems = matches.length > 0;
  const finish = () => router.replace('/(tabs)' as Href);
  return <Screen>
    <TopBar title="AI 확인 결과" />
    <View style={styles.body}>
      <AiBanner minHeight={164} characterWidth={118}>
        <Badge text={hasItems ? '잠깐! 이미 있어요' : 'AI 확인 완료'} tone={hasItems ? 'danger' : 'ai'} />
        <Text style={type.resultTitle}>{hasItems ? `'${query}'와(과) 비슷한\n제품이 ${matches.length}개 있어요` : `'${query}'은(는)\n보유한 제품이 없어요`}</Text>
        <Text style={[type.bodySm, styles.muted]}>{hasItems ? '새로 사지 않아도 될 것 같아요' : '필요하다면 구매해도 괜찮아요'}</Text>
      </AiBanner>
      {hasItems && <>
        <Text style={type.sectionTitle}>내가 가진 물품</Text>
        <Card style={styles.matches}>{matches.map((item, index) => <View key={item.id} style={[styles.match, index > 0 && styles.divider]}><Thumb size={56} /><View style={styles.copy}><Badge text={item.name.replace(/\s/g, '').includes(query.replace(/\s/g, '')) ? '같은 제품' : '비슷한 제품'} tone="soft" /><Text style={type.itemName}>{item.name}</Text><StatusTag text={productStatus(item)} isExpiry={Boolean(item.expiresAt)} daysLeft={item.daysLeft ?? 999} /></View></View>)}</Card>
        <Card style={styles.recommend}><Text style={[type.itemName, styles.deep]}>AI 추천</Text><Text style={type.bodySm}>✓ 지금 보유한 제품부터 먼저 사용하기</Text><Text style={type.bodySm}>✓ 부족해질 시점에 알림 받기</Text></Card>
      </>}
      <View style={styles.buttons}>
        <Button variant="soft" style={styles.flex} label={hasItems ? (from === 'register' ? '그래도 등록할게요' : '그래도 구매할래요') : '구매할게요'} onPress={finish} />
        <Button style={styles.flex} label={hasItems ? (from === 'register' ? '구매하지 않을게요' : '구매하지 않을래요') : '홈으로'} onPress={finish} />
      </View>
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  body: { gap: spacing['2xl'] }, muted: { color: colors.textSecondary }, matches: { gap: 10 },
  match: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 }, divider: { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 14 }, copy: { flex: 1, gap: 5 },
  recommend: { gap: 6, backgroundColor: colors.sub }, deep: { color: colors.deep }, buttons: { flexDirection: 'row', gap: 8 }, flex: { flex: 1, paddingHorizontal: 8 },
});
