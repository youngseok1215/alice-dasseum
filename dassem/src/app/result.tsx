import { router, type Href, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { Screen, TopBar } from '@/components/screen';
import { findSimilarProducts, productStatus } from '@/data/mock-products';
import { showToast, type ToastMessage } from '@/data/toast-store';
import { AiBanner, Badge, Button, Card, StatusTag, Thumb } from '@/theme/components';
import { colors, spacing, type } from '@/theme/tokens';

const recommendations = ['지금 보유한 제품부터 먼저 사용하기', '부족해질 시점에 알림 받기'];

export default function ResultScreen() {
  const params = useLocalSearchParams<{ from?: 'register' | 'search'; q?: string }>();
  const from = params.from ?? 'search';
  const query = params.q?.trim() || '제품';
  const matches = findSimilarProducts(query);
  const hasItems = matches.length > 0;
  const fromRegister = from === 'register';

  // 버튼을 누르면 홈으로 가면서 완료 토스트를 띄워요
  const finish = (toast?: ToastMessage) => {
    router.replace('/(tabs)' as Href);
    if (toast) showToast(toast);
  };
  const keep = () => finish(fromRegister
    ? { title: '물품을 등록했어요', sub: '내 물품에서 사용 순서를 확인해 보세요' }
    : { title: '구매 후 물품을 등록해 주세요', sub: '등록하면 다음 중복 구매도 막아드려요' });
  const stop = () => finish(hasItems ? { title: '중복 구매를 막았어요', sub: '가진 제품부터 먼저 써요' } : undefined);

  return <Screen>
    <TopBar title="AI 확인 결과" />
    <View style={styles.body}>
      <AiBanner minHeight={164} characterWidth={118}>
        <Badge text={hasItems ? '잠깐! 이미 있어요' : 'AI 확인 완료'} tone={hasItems ? 'danger' : 'ai'} />
        {/* 제품명은 따로 한 줄 + 말줄임 → 이름 길이와 상관없이 제목 모양이 같아요 */}
        <Text numberOfLines={1} style={[type.itemName, styles.deep]}>{query}</Text>
        <Text style={type.resultTitle}>{hasItems ? `비슷한 제품이\n${matches.length}개 있어요` : '보유한 제품이\n없어요'}</Text>
        <Text style={[type.bodySm, styles.muted]}>{hasItems ? '새로 사지 않아도 될 것 같아요' : '필요하다면 구매해도 괜찮아요'}</Text>
      </AiBanner>
      {hasItems && <>
        <Text style={type.sectionTitle}>내가 가진 물품</Text>
        <Card style={styles.matches}>{matches.map((item, index) => <View key={item.id} style={[styles.match, index > 0 && styles.divider]}><Thumb uri={item.imageUri} category={item.category} size={56} /><View style={styles.copy}><Badge text={item.name.replace(/\s/g, '').includes(query.replace(/\s/g, '')) ? '같은 제품' : '비슷한 제품'} tone="soft" /><Text style={type.itemName}>{item.name}</Text><StatusTag text={productStatus(item)} isExpiry={Boolean(item.expiresAt)} daysLeft={item.daysLeft ?? 999} /></View></View>)}</Card>
        <Card style={styles.recommend}>
          <Text style={[type.itemName, styles.deep]}>AI 추천</Text>
          {recommendations.map((text) => <View key={text} style={styles.recRow}><AppIcon symbol="checkmark" fallback="checkmark" size={16} color={colors.deep} /><Text style={type.bodySm}>{text}</Text></View>)}
        </Card>
      </>}
      <View style={styles.buttons}>
        <Button variant="soft" style={styles.flex} label={hasItems ? (fromRegister ? '그래도 등록할게요' : '그래도 구매할래요') : (fromRegister ? '등록할게요' : '구매할게요')} onPress={keep} />
        <Button style={styles.flex} label={hasItems ? (fromRegister ? '구매하지 않을게요' : '구매하지 않을래요') : '홈으로'} onPress={stop} />
      </View>
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  body: { gap: spacing['2xl'] }, muted: { color: colors.textSecondary }, matches: { gap: 10 },
  match: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 }, divider: { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 14 }, copy: { flex: 1, gap: 5 },
  recommend: { gap: 6, backgroundColor: colors.sub }, recRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, deep: { color: colors.deep },
  buttons: { flexDirection: 'row', gap: 8 }, flex: { flex: 1, paddingHorizontal: 8 },
});
