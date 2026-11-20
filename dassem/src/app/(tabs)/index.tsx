import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { Header, Mascot } from '@/components/prototype-ui';
import { Screen } from '@/components/screen';
import { useAppStore } from '@/data/app-store';
import type { Product } from '@/types/product';
import { colors, fonts, type } from '@/theme/tokens';

function SectionHead({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <View style={styles.sectionHead}><Text style={styles.sectionTitle}>{title}</Text>{action && <Pressable onPress={onAction}><Text style={styles.textAction}>{action}</Text></Pressable>}</View>;
}

function ProductImage({ size = 44 }: { size?: number }) {
  return <View style={[styles.productImage, { width: size, height: size, borderRadius: size > 60 ? 12 : 10 }]}><AppIcon symbol="photo" fallback="image-outline" size={Math.max(18, Math.round(size / 3))} color="rgba(55,56,60,.45)" /></View>;
}

function FirstCard({ product }: { product: Product }) {
  return <Pressable style={styles.firstCard} onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })}>
    <ProductImage size={124} />
    <Text numberOfLines={2} style={styles.firstName}>{product.name}</Text>
    <View style={styles.reasonBadge}><Text style={styles.reasonText}>{product.recommendReason ?? `사용기한 D-${product.dday}`}</Text></View>
  </Pressable>;
}

function UrgentRow({ product, divided }: { product: Product; divided?: boolean }) {
  const expired = typeof product.dday === 'number' && product.dday < 0;
  return <Pressable style={[styles.urgentRow, divided && styles.divided]} onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })}>
    <ProductImage />
    <View style={styles.urgentCopy}><Text numberOfLines={1} style={styles.urgentName}>{product.name}</Text><Text style={styles.urgentMeta}>{product.category} · {product.openedAt ? '개봉' : '미개봉'}</Text></View>
    <View style={[styles.deadlineBadge, expired && styles.expiredBadge]}><Text style={[styles.deadlineText, expired && styles.expiredText]}>{expired ? '기한 지남' : `D-${product.dday}`}</Text></View>
  </Pressable>;
}

export default function HomeScreen() {
  const { products, holds, done } = useAppStore();
  const get = (id: string) => products.find((product) => product.id === id);
  const firsts = ['toner', 'multi', 'sun'].map(get).filter((product): product is Product => Boolean(product));
  const urgent = ['eye', 'toner'].map(get).filter((product): product is Product => Boolean(product));

  return <Screen>
    <Header right={<Pressable onPress={() => router.push('/notifications')} style={styles.bell}><AppIcon symbol="bell" fallback="notifications-outline" size={24} color={colors.text} /><View style={styles.noticeDot} /></Pressable>} />
    <View style={styles.intro}>
      <View style={styles.introCopy}><Text style={styles.greeting}>확인이 필요한 제품이{`\n`}2개 있어요</Text><Text style={styles.slogan}>있는 걸 먼저, 끝까지 다 쓰는 습관</Text></View>
      <Mascot kind="smile" size={140} />
    </View>

    <View style={styles.quickActions}>
      <Pressable style={styles.quickCard} onPress={() => router.push({ pathname: '/check/camera', params: { purpose: 'register' } })}>
        <AppIcon symbol="camera" fallback="camera-outline" size={24} color={colors.text} />
        <View><Text style={styles.quickTitle}>제품 등록</Text><Text style={styles.quickSub}>찍어서 내 물품에 추가</Text></View>
      </Pressable>
      <Pressable style={[styles.quickCard, styles.quickMint]} onPress={() => router.push('/(tabs)/check')}>
        <AppIcon symbol="magnifyingglass" fallback="search" size={24} color={colors.text} />
        <View><Text style={styles.quickTitle}>구매 전 확인</Text><Text style={styles.quickSub}>사기 전에 먼저 확인해요</Text></View>
      </Pressable>
    </View>

    <SectionHead title="먼저 써야 할 제품" action="전체보기" onAction={() => router.push('/first')} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.firstList}>{firsts.map((product) => <FirstCard key={product.id} product={product} />)}</ScrollView>

    <SectionHead title="사용기한 임박" />
    <View style={styles.urgentCard}>{urgent.map((product, index) => <UrgentRow key={product.id} product={product} divided={index > 0} />)}</View>

    <Pressable style={styles.recordCard} onPress={() => router.push('/records')}>
      <View style={styles.recordCopy}><Text style={styles.recordEyebrow}>이번 달 소비 관리</Text><Text style={styles.recordTitle}>다씀 {done.length}개 · 구매 보류 {holds.length}회</Text></View>
      <AppIcon symbol="chevron.right" fallback="chevron-forward" size={20} color={colors.textTertiary} />
    </Pressable>
  </Screen>;
}

const styles = StyleSheet.create({
  bell: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  noticeDot: { position: 'absolute', right: 7, top: 7, width: 7, height: 7, borderRadius: 4, backgroundColor: '#E5484D', borderWidth: 1.5, borderColor: colors.background },
  intro: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 20 },
  introCopy: { flex: 1 },
  greeting: { ...type.screenTitle, fontSize: 22, lineHeight: 30, fontFamily: fonts.bold },
  slogan: { ...type.bodySm, fontSize: 14, lineHeight: 20, color: colors.textSecondary, marginTop: 6, fontFamily: fonts.medium },
  quickActions: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  quickCard: { flex: 1, minHeight: 112, padding: 16, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider, justifyContent: 'space-between' },
  quickMint: { backgroundColor: colors.sub, borderColor: colors.sub },
  quickTitle: { ...type.body, fontFamily: fonts.bold, lineHeight: 24 },
  quickSub: { ...type.caption, fontSize: 13, lineHeight: 18, color: colors.textSecondary, fontFamily: fonts.medium },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { ...type.cardTitle, fontSize: 17, lineHeight: 24, fontFamily: fonts.bold },
  textAction: { ...type.caption, color: colors.deep, fontFamily: fonts.bold },
  firstList: { gap: 10, paddingBottom: 28 },
  firstCard: { width: 148, flexShrink: 0, padding: 12, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider, gap: 10 },
  productImage: { backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.divider },
  firstName: { ...type.bodySm, fontSize: 14, lineHeight: 20, minHeight: 40, fontFamily: fonts.semibold },
  reasonBadge: { alignSelf: 'flex-start', minHeight: 22, paddingHorizontal: 7, borderRadius: 6, backgroundColor: colors.sub, justifyContent: 'center' },
  reasonText: { ...type.tag, color: colors.text, fontFamily: fonts.semibold },
  urgentCard: { paddingVertical: 4, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider, marginBottom: 28 },
  urgentRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  divided: { borderTopWidth: 1, borderTopColor: colors.divider },
  urgentCopy: { flex: 1 }, urgentName: { ...type.itemName, fontFamily: fonts.semibold }, urgentMeta: { ...type.caption, color: colors.textSecondary, fontFamily: fonts.medium },
  deadlineBadge: { minHeight: 22, paddingHorizontal: 7, borderRadius: 6, justifyContent: 'center', backgroundColor: colors.cautionBg },
  deadlineText: { ...type.tag, color: colors.caution, fontFamily: fonts.semibold }, expiredBadge: { backgroundColor: colors.dangerBg }, expiredText: { color: colors.danger },
  recordCard: { minHeight: 74, paddingLeft: 20, paddingRight: 16, paddingVertical: 16, borderRadius: 16, backgroundColor: colors.cream, flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  recordCopy: { flex: 1 }, recordEyebrow: { ...type.caption, fontFamily: fonts.semibold, color: colors.textSecondary }, recordTitle: { ...type.cardTitle, marginTop: 2, fontFamily: fonts.bold },
});
