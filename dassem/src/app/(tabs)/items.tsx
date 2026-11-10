import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { mockProducts, productStatus } from '@/data/mock-products';
import { AiNote, CategoryTag, Chip, StatusTag, Thumb } from '@/theme/components';
import { colors, radius, spacing, type } from '@/theme/tokens';
import { useMemo, useState } from 'react';

const categories = ['전체', '화장품', '영양제', '의약품', '생활용품'] as const;

export default function ItemsScreen() {
  const [category, setCategory] = useState<(typeof categories)[number]>('전체');
  const items = useMemo(() => mockProducts.filter((item) => category === '전체' || item.category === category).toSorted((a, b) => (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999)), [category]);
  return <Screen>
    <View style={styles.header}><Text style={type.screenTitle}>내 물품</Text><Text style={[type.bodySm, styles.muted]}>보유 {mockProducts.length}개</Text></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{categories.map((item) => <Chip key={item} label={item} active={category === item} onPress={() => setCategory(item)} />)}</ScrollView>
    <AiNote eyebrow="AI 사용 순서 추천" text="유통기한이 짧거나 먼저 개봉한 제품부터 써요" />
    <View style={styles.list}>{items.map((item, index) => <View key={item.id} style={styles.item}>
      <View style={[styles.rank, { backgroundColor: colors.rank[Math.min(index, 3)] }]}><Text style={styles.rankText}>{index + 1}</Text></View>
      <Thumb uri={item.imageUri} size={52} />
      <View style={styles.copy}><Text style={type.itemName}>{item.name}</Text><View style={styles.tags}><CategoryTag text={item.category} /><StatusTag text={productStatus(item)} isExpiry={Boolean(item.expiresAt)} daysLeft={item.daysLeft ?? 999} /></View></View>
    </View>)}</View>
  </Screen>;
}

const styles = StyleSheet.create({
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, muted: { color: colors.textTertiary },
  chips: { gap: 8, paddingBottom: 14 }, list: { marginTop: spacing['2xl'], gap: spacing.md },
  item: { minHeight: 82, borderWidth: 1, borderColor: colors.border, borderRadius: radius.input, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: colors.background },
  rank: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, rankText: { ...type.tag, color: colors.onPrimary, fontFamily: 'Pretendard-Bold' },
  copy: { flex: 1, gap: 6 }, tags: { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
});
