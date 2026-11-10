import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { Screen } from '@/components/screen';
import { expirySoonCount } from '@/data/mock-products';
import { ActionTile, AiBanner, Badge, Card, Thumb } from '@/theme/components';
import { colors, radius, spacing, type } from '@/theme/tokens';

const logo = require('../../../assets/dasseum/logo-mark.png');

export default function HomeScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.brand}><Image source={logo} contentFit="contain" style={styles.logo} /><Text style={type.logo}>다씀</Text></View>
        <View><AppIcon symbol="bell.fill" fallback="notifications" size={26} color={colors.text} /><View style={styles.noticeDot} /></View>
      </View>
      <View style={styles.sections}>
        <AiBanner onPress={() => router.push('/search')}>
          <Badge text="AI 물품 도우미" />
          <Text style={type.bannerTitle}>사기 전에,{`\n`}다씀에 확인해 보세요</Text>
          <Text style={[type.bodySm, styles.muted]}>사진으로 제품을 찾고{`\n`}이미 있는 물품과 비교해요</Text>
        </AiBanner>
        <View style={styles.actions}>
          <ActionTile variant="primary" title="물품 등록" sub="사진으로 간편하게" onPress={() => router.push('/register')} icon={<AppIcon symbol="camera.fill" fallback="camera" size={34} color={colors.onPrimary} />} />
          <ActionTile variant="soft" title="구매 전 확인" sub="보유 제품과 비교" onPress={() => router.push('/search')} icon={<AppIcon symbol="viewfinder" fallback="scan" size={36} color={colors.deep} />} />
        </View>
        <Text style={type.sectionTitle}>최근 AI 확인 결과</Text>
        <Pressable onPress={() => router.push({ pathname: '/result', params: { from: 'search', q: '세제' } })}>
          <Card style={styles.resultCard}>
            <Thumb size={112} />
            <View style={styles.resultCopy}>
              <Badge text="비슷한 제품" tone="soft" />
              <Text style={type.cardTitle}>비슷한 세제가 있어요</Text>
              <Text numberOfLines={2} style={[type.caption, styles.muted]}>등록된 세제와 종류는 같고 용량은 달라요</Text>
              <Text style={styles.link}>제품 비교하기 →</Text>
            </View>
          </Card>
        </Pressable>
        <Pressable onPress={() => router.push('/(tabs)/items')} style={styles.expiryRow}>
          <AppIcon symbol="calendar" fallback="calendar" size={23} color={colors.deep} />
          <Text style={[type.itemName, styles.flex]}>기한 임박 물품 <Text style={styles.danger}>{expirySoonCount}개</Text></Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 }, logo: { width: 30, height: 28 },
  noticeDot: { position: 'absolute', right: -1, top: -1, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, borderWidth: 1.5, borderColor: colors.background },
  sections: { gap: spacing['2xl'] }, muted: { color: colors.textSecondary },
  actions: { flexDirection: 'row', gap: spacing.lg },
  resultCard: { flexDirection: 'row', gap: spacing['2xl'] }, resultCopy: { flex: 1, justifyContent: 'space-between', paddingVertical: 2 },
  link: { ...type.itemName, fontFamily: 'Pretendard-ExtraBold', color: colors.deep },
  expiryRow: { height: 60, borderWidth: 1, borderColor: colors.border, borderRadius: radius.input, flexDirection: 'row', alignItems: 'center', gap: spacing.xl, paddingHorizontal: spacing['3xl'] },
  flex: { flex: 1 }, danger: { color: colors.danger }, chevron: { ...type.screenTitle, color: colors.textDisabled },
});
