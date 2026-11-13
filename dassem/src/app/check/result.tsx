import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/app-icon';
import { colors, fonts, type } from '@/theme/tokens';

type Verdict = 'same' | 'similar' | 'none';
function verdictFor(query: string, mode: string): Verdict {
  if (mode === 'photo') return 'same';
  const normalized = query.toLowerCase().replace(/\s/g, '');
  if (/2000/.test(normalized) && /비타민d|vitamind/.test(normalized)) return 'similar';
  if (/비타민d|vitamind|비타민디/.test(normalized)) return 'same';
  return 'none';
}

function Button({ label, outline, onPress }: { label: string; outline?: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.button, outline && styles.buttonOutline]}><Text style={styles.buttonText}>{label}</Text></Pressable>;
}

export default function ResultScreen() {
  const { q = '제품', purpose = 'check', mode = 'search' } = useLocalSearchParams<{ q?: string; purpose?: string; mode?: string }>();
  const verdict = verdictFor(q, mode);
  const hasProduct = verdict !== 'none';
  const title = verdict === 'same' ? '이미 가지고 있어요' : verdict === 'similar' ? '비슷한 제품이 있어요' : '가지고 있는 제품이 없어요';
  const sub = verdict === 'same' ? '내 물품에 같은 제품이 1개 있어요.' : verdict === 'similar' ? '같은 브랜드의 다른 용량 제품이에요.' : `내 물품에서 ‘${q}’과 같거나 비슷한 제품을 찾지 못했어요.`;
  const badge = verdict === 'same' ? '동일 제품 있음' : verdict === 'similar' ? '유사 제품 있음' : '보유 제품 없음';
  const finish = () => router.replace('/(tabs)/check');

  if (purpose === 'register') {
    return <SafeAreaView style={styles.safe}><View style={styles.screen}><View style={styles.topBar}><Pressable onPress={() => router.back()} style={styles.topButton}><AppIcon symbol="chevron.left" fallback="chevron-back" size={24} color={colors.text} /></Pressable><Text style={styles.topTitle}>AI 인식 완료</Text><View style={styles.topButton} /></View><ScrollView contentContainerStyle={styles.content}><View style={styles.queryBar}><AppIcon symbol="camera" fallback="camera-outline" size={18} color={colors.textSecondary} /><Text style={styles.queryText}>촬영한 사진에서 정보를 찾았어요</Text></View><View style={styles.badgeMint}><Text style={styles.badgeText}>인식 완료</Text></View><Text style={styles.title}>비타민D 정보를 찾았어요</Text><Text style={styles.sub}>제품명과 카테고리를 자동으로 입력했어요.</Text><View style={styles.productCard}><Text style={styles.fieldLabel}>제품명</Text><Text style={styles.productName}>비타민D 2000IU</Text><View style={styles.divider} /><Text style={styles.fieldLabel}>카테고리</Text><Text style={styles.value}>영양제</Text><View style={styles.divider} /><Text style={styles.fieldLabel}>유통기한</Text><Text style={styles.value}>2027-11-12</Text></View></ScrollView><View style={styles.actions}><Button label="등록 완료" onPress={() => router.replace('/(tabs)/items')} /></View></View></SafeAreaView>;
  }

  return <SafeAreaView style={styles.safe}><View style={styles.screen}>
    <View style={styles.topBar}><Pressable accessibilityLabel="뒤로가기" onPress={() => router.back()} style={styles.topButton}><AppIcon symbol="chevron.left" fallback="chevron-back" size={24} color={colors.text} /></Pressable><Text style={styles.topTitle}>확인 결과</Text><View style={styles.topButton} /></View>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.queryBar}><AppIcon symbol={mode === 'photo' ? 'camera' : 'magnifyingglass'} fallback={mode === 'photo' ? 'camera-outline' : 'search'} size={18} color={colors.textSecondary} /><Text style={styles.queryText}>{mode === 'photo' ? '촬영한 사진으로 확인했어요' : `‘${q}’ 확인 결과`}</Text></View>
      <View style={[styles.badge, verdict === 'similar' && styles.badgeMint, verdict === 'none' && styles.badgeOk]}><Text style={[styles.badgeText, verdict === 'none' && styles.badgeOkText]}>{badge}</Text></View>
      <Text style={styles.title}>{title}</Text><Text style={styles.sub}>{sub}</Text>
      {hasProduct && <View style={styles.productCard}>
        <View style={styles.productTop}><View style={styles.productImage}><AppIcon symbol="photo" fallback="image-outline" size={26} color="rgba(55,56,60,.45)" /></View><View style={styles.productCopy}><Text style={styles.brand}>온데이 · 영양제</Text><Text style={styles.productName}>온데이 비타민D3 1000IU 90정</Text>{verdict === 'similar' && <Text style={styles.difference}>확인한 제품과 용량이 달라요 (1000IU · 2000IU)</Text>}</View></View>
        <View style={styles.detailGrid}><View style={styles.detailLine}><Text style={styles.fieldLabel}>개봉일</Text><Text style={styles.detailValue}>2026.09.03 개봉</Text></View><View style={styles.detailLine}><Text style={styles.fieldLabel}>사용기한</Text><View style={styles.expiryRow}><Text style={styles.detailValue}>2027.06.30</Text><View style={styles.neutralBadge}><Text style={styles.neutralText}>D-230</Text></View></View></View></View>
        <Pressable onPress={() => router.push({ pathname: '/product/[id]', params: { id: 'vitd' } })} style={styles.detailButton}><Text style={styles.detailButtonText}>보유 제품 상세 보기</Text></Pressable>
      </View>}
      <View style={styles.notice}><AppIcon symbol="info.circle" fallback="information-circle-outline" size={18} color={colors.textSecondary} /><Text style={styles.noticeText}>AI 확인 결과는 참고용이에요. 실제 제품을 확인해 주세요.{hasProduct && `\n영양제·의약품의 효능이나 대체 가능 여부는 안내하지 않아요.`}</Text></View>
    </ScrollView>
    <View style={styles.actions}>{verdict === 'none' ? <><Button label="확인 완료" onPress={finish} /><Button label="다시 확인하기" outline onPress={finish} /></> : <><Button label="구매 보류" onPress={() => router.replace({ pathname: '/check/held', params: { q, id: 'vitd' } })} /><Button label="그래도 구매할게요" outline onPress={finish} /></>}</View>
  </View></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, screen: { flex: 1, width: '100%', maxWidth: 375, alignSelf: 'center', backgroundColor: colors.background },
  topBar: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }, topButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, topTitle: { ...type.headerTitle, flex: 1, fontFamily: fonts.semibold },
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 20 }, queryBar: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: 'rgba(112,115,124,.05)', marginBottom: 20 }, queryText: { ...type.bodySm, color: colors.textSecondary, fontFamily: fonts.medium },
  badge: { alignSelf: 'flex-start', minHeight: 22, justifyContent: 'center', paddingHorizontal: 7, borderRadius: 6, backgroundColor: '#FFF1E0' }, badgeMint: { backgroundColor: colors.sub }, badgeOk: { backgroundColor: '#E3F7EA' }, badgeText: { ...type.tag, color: '#8F4500', fontFamily: fonts.semibold }, badgeOkText: { color: '#0B6E30' },
  title: { ...type.screenTitle, fontSize: 24, lineHeight: 32, fontFamily: fonts.bold, marginTop: 10 }, sub: { ...type.body, fontSize: 15, lineHeight: 22, color: colors.textSecondary, fontFamily: fonts.medium, marginTop: 4 },
  productCard: { marginTop: 20, padding: 16, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider }, productTop: { flexDirection: 'row', gap: 14 }, productImage: { width: 72, height: 72, borderRadius: 12, backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.divider, alignItems: 'center', justifyContent: 'center' }, productCopy: { flex: 1 }, brand: { ...type.caption, color: colors.textSecondary, fontFamily: fonts.medium }, productName: { ...type.body, fontFamily: fonts.semibold, marginTop: 2 }, difference: { ...type.caption, color: colors.textSecondary, fontFamily: fonts.medium, marginTop: 4 },
  detailGrid: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.divider, gap: 6 }, detailLine: { flexDirection: 'row', alignItems: 'center' }, fieldLabel: { ...type.bodySm, width: 72, color: colors.textSecondary, fontFamily: fonts.medium }, detailValue: { ...type.bodySm, flex: 1, fontFamily: fonts.semibold }, expiryRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }, neutralBadge: { borderRadius: 6, backgroundColor: colors.surfaceMuted, paddingHorizontal: 7, minHeight: 22, justifyContent: 'center' }, neutralText: { ...type.tag, color: colors.textSecondary, fontFamily: fonts.semibold },
  detailButton: { height: 44, marginTop: 14, borderRadius: 12, borderWidth: 1, borderColor: '#D7DBD9', alignItems: 'center', justifyContent: 'center' }, detailButtonText: { ...type.bodySm, fontFamily: fonts.bold },
  notice: { marginTop: 20, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.cream, flexDirection: 'row', gap: 8 }, noticeText: { ...type.caption, flex: 1, fontSize: 13, lineHeight: 19, color: colors.textSecondary, fontFamily: fonts.medium },
  actions: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, gap: 8, backgroundColor: colors.background }, button: { height: 52, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, buttonOutline: { backgroundColor: colors.background, borderWidth: 1, borderColor: '#D7DBD9' }, buttonText: { ...type.button, fontFamily: fonts.bold },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: 12 }, value: { ...type.body, fontFamily: fonts.semibold, marginTop: 3 },
});
