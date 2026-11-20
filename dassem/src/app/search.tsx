import { router } from 'expo-router';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useMemo, useState } from 'react';

import { AppIcon } from '@/components/app-icon';
import { Screen, TopBar } from '@/components/screen';
import { findSimilarProducts, productStatus } from '@/data/mock-products';
import { AiBanner, Badge, Button, Card, Chip, StatusTag, Thumb } from '@/theme/components';
import { colors, radius, spacing, type } from '@/theme/tokens';

const popular = ['비타민', '오메가3', '유산균', '안약'];

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const matches = useMemo(() => findSimilarProducts(query), [query]);
  const submit = () => query.trim() && router.push({ pathname: '/result', params: { from: 'search', q: query.trim() } });
  return <Screen>
    <TopBar title="구매 전 확인" />
    <View style={styles.body}>
      <AiBanner minHeight={132} characterWidth={112}><Badge text="AI 물품 도우미" /><Text style={type.resultTitle}>지금 구매하려는 제품이{`\n`}이미 있나요?</Text></AiBanner>
      <View style={styles.searchRow}>
        <View style={styles.search}><AppIcon symbol="magnifyingglass" fallback="search" size={22} color={colors.deep} /><TextInput value={query} onChangeText={setQuery} onSubmitEditing={submit} returnKeyType="search" placeholder="제품명을 입력하세요" placeholderTextColor={colors.textDisabled} style={styles.input} /></View>
        <Button label="" onPress={() => router.push('/register')} variant="soft" style={styles.camera} icon={<AppIcon symbol="camera.fill" fallback="camera" size={25} color={colors.deep} />} />
      </View>
      <View><Text style={[type.itemName, styles.label]}>인기 검색어</Text><View style={styles.chips}>{popular.map((item) => <Chip key={item} label={item} onPress={() => setQuery(item)} />)}</View></View>
      {Boolean(query.trim()) && <Card style={styles.preview}><Text style={type.itemName}>AI가 내 물품에서 {matches.length}개를 찾았어요</Text>{matches.map((item) => <View key={item.id} style={styles.item}><Thumb uri={item.imageUri} category={item.category} size={44} /><View style={styles.itemCopy}><Text style={type.itemName}>{item.name}</Text><StatusTag text={productStatus(item)} isExpiry={Boolean(item.expiresAt)} daysLeft={item.daysLeft ?? 999} /></View></View>)}{matches.length === 0 && <Text style={[type.bodySm, styles.muted]}>비슷한 물품이 아직 없어요.</Text>}</Card>}
      <Button label="AI로 확인하기" disabled={!query.trim()} onPress={submit} />
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  body: { gap: spacing['2xl'] }, searchRow: { flexDirection: 'row', gap: 8 },
  search: { flex: 1, height: 56, borderWidth: 2, borderColor: colors.primary, borderRadius: radius.input, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14 }, input: { ...type.body, flex: 1, color: colors.text },
  camera: { width: 56, paddingHorizontal: 0 }, label: { marginBottom: 8 }, chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  preview: { gap: 10 }, item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.divider }, itemCopy: { flex: 1, gap: 4 }, muted: { color: colors.textTertiary },
});
