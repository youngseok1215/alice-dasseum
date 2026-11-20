import { router, useLocalSearchParams } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/app-icon';
import { markDone, markOpened, useAppStore } from '@/data/app-store';
import { colors, fonts, type } from '@/theme/tokens';

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(); const { products } = useAppStore(); const product = products.find((p) => p.id === id);
  if (!product) return <SafeAreaView style={styles.safe}><View style={styles.screen}><Text style={styles.empty}>제품을 찾을 수 없어요.</Text></View></SafeAreaView>;
  const row = (label: string, value: React.ReactNode, last = false) => <View style={[styles.row, last && styles.lastRow]}><Text style={styles.rowLabel}>{label}</Text><View style={styles.rowValue}>{value}</View></View>;
  return <SafeAreaView style={styles.safe}><View style={styles.screen}>
    <View style={styles.topBar}><Pressable onPress={() => router.back()} style={styles.topButton}><AppIcon symbol="chevron.left" fallback="chevron-back" size={24} color={colors.text} /></Pressable><View style={styles.topTitle} /><Pressable style={styles.topButton}><AppIcon symbol="ellipsis" fallback="ellipsis-vertical" size={22} color={colors.text} /></Pressable></View>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.photo}>{product.imageUri ? <Image source={{ uri: product.imageUri }} style={styles.photoImage} resizeMode="contain" /> : <><AppIcon symbol="photo" fallback="image-outline" size={32} color="rgba(55,56,60,.45)" /><Text style={styles.photoLabel}>제품 사진</Text></>}</View>
      <View style={styles.category}><Text style={styles.categoryText}>{product.category}</Text></View><Text style={styles.brand}>{product.brand}</Text><Text style={styles.name}>{product.name}</Text>
      {product.recommendReason && <View style={styles.reason}><Text style={styles.reasonText}>먼저 써 보세요 · {product.recommendReason}</Text></View>}
      <View style={styles.rows}>
        {row('사용기한', <View style={styles.inline}><Text style={styles.value}>{product.expiresAt ?? '기한 미입력'}</Text>{typeof product.dday === 'number' && <View style={styles.badge}><Text style={styles.badgeText}>{product.dday < 0 ? '기한 지남' : `D-${product.dday}`}</Text></View>}</View>)}
        {row('개봉일', product.openedAt ? <Text style={styles.value}>{product.openedAt}</Text> : <View style={styles.inline}><Text style={[styles.value, styles.flex]}>미개봉</Text><Pressable onPress={() => markOpened(product.id)}><Text style={styles.openToday}>오늘 개봉했어요</Text></Pressable></View>)}
        {row('등록일', <Text style={styles.value}>{product.registeredAt}</Text>)}
        {product.memo ? row('메모', <Text style={styles.value}>{product.memo}</Text>, true) : null}
      </View>
      {['영양제', '의약품'].includes(product.category) && <Text style={styles.notice}>사용기한은 제품에 표기된 정보를 기준으로 해요.</Text>}
    </ScrollView>
    <View style={styles.actions}><Pressable style={styles.doneButton} onPress={() => { const name = product.name; const category = product.category; markDone(product.id); router.replace({ pathname: '/done/[id]', params: { id: product.id, name, category } }); }}><Text style={styles.doneText}>다씀</Text></Pressable></View>
  </View></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, screen: { flex: 1, width: '100%', maxWidth: 375, alignSelf: 'center' }, topBar: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }, topButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, topTitle: { flex: 1 }, content: { paddingHorizontal: 20, paddingBottom: 20 }, photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: 16, backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.divider, alignItems: 'center', justifyContent: 'center', gap: 6, overflow: 'hidden' }, photoImage: { width: '100%', height: '100%' }, photoLabel: { ...type.caption, color: colors.textSecondary, fontFamily: fonts.medium }, category: { alignSelf: 'flex-start', marginTop: 20, paddingHorizontal: 7, minHeight: 22, borderRadius: 6, backgroundColor: colors.surfaceMuted, justifyContent: 'center' }, categoryText: { ...type.tag, color: colors.textSecondary, fontFamily: fonts.semibold }, brand: { ...type.bodySm, color: colors.textSecondary, fontFamily: fonts.medium, marginTop: 10 }, name: { ...type.screenTitle, fontSize: 22, lineHeight: 30, fontFamily: fonts.bold, marginTop: 2 }, reason: { marginTop: 14, borderRadius: 12, backgroundColor: colors.sub, paddingHorizontal: 14, paddingVertical: 10 }, reasonText: { ...type.bodySm, fontFamily: fonts.semibold }, rows: { marginTop: 16 }, row: { minHeight: 52, borderBottomWidth: 1, borderBottomColor: colors.divider, flexDirection: 'row', alignItems: 'center' }, lastRow: { borderBottomWidth: 0 }, rowLabel: { ...type.body, width: 88, fontSize: 15, color: colors.textSecondary, fontFamily: fonts.medium }, rowValue: { flex: 1 }, value: { ...type.body, fontSize: 15, fontFamily: fonts.semibold }, inline: { flexDirection: 'row', alignItems: 'center', gap: 8 }, flex: { flex: 1 }, badge: { minHeight: 22, borderRadius: 6, backgroundColor: colors.surfaceMuted, paddingHorizontal: 7, justifyContent: 'center' }, badgeText: { ...type.tag, color: colors.textSecondary, fontFamily: fonts.semibold }, openToday: { ...type.bodySm, color: colors.text, fontFamily: fonts.semibold, paddingVertical: 8 }, notice: { ...type.caption, color: colors.textSecondary, fontFamily: fonts.medium, marginTop: 12 }, actions: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }, doneButton: { height: 52, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, doneText: { ...type.button, fontFamily: fonts.bold }, empty: { ...type.body, textAlign: 'center', padding: 40 } });
