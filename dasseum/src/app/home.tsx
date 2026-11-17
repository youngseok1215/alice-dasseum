// 1. 홈
import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Screen, Scroll } from '@/components/shell';
import { Card, DBadge, ddayBadge, Icon, IconBtn, Line, Mascot, Press, ProdImg, SectionHead, T } from '@/components/ui';
import { byDday, reasonOf } from '@/data/products';
import { useApp } from '@/store/AppStore';
import { BRAND_FONT, C, tx } from '@/theme/tokens';

export default function Home() {
  const { holdList, dones, products, completed, notifyEnabled, alertsSeen, markAlertsSeen } = useApp();
  const activeProducts = products().filter((p) => !completed.includes(p.id));
  const firsts = activeProducts.filter((p) => reasonOf(p)).sort(byDday);
  const urgent = activeProducts.filter((p) => p.dday !== null && p.dday <= 7).sort((a, b) => (a.dday ?? 9999) - (b.dday ?? 9999));
  const openDetail = (id: string) => router.push({ pathname: '/product/[id]', params: { id } });

  return (
    <Screen tab="home">
      <Scroll contentContainerStyle={{ paddingBottom: 28 }}>
        <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 8 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <T style={{ fontFamily: BRAND_FONT, fontSize: 22, lineHeight: 27, letterSpacing: 1.32, color: C.logo }}>다씀</T>
            <Svg width={14} height={14} viewBox="0 0 20 20" style={{ marginTop: 6 }}>
              <Circle cx={10} cy={10} r={10} fill={C.point} />
              <Path d="M5.5 10.5 L8.7 13.6 L14.5 7" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>
          <IconBtn name="bell" label="사용기한 알림" dot={notifyEnabled && !alertsSeen} onPress={() => { markAlertsSeen(); router.push('/alerts'); }} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 4, paddingRight: 12, paddingBottom: 20, paddingLeft: 20, marginTop: -10 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T style={tx(20, 28, 700)} numberOfLines={2}>{urgent.length ? `확인이 필요한 제품이\n${urgent.length}개 있어요` : '지금 확인할 제품이\n없어요'}</T>
            <T style={[tx(13, 19, 400, C.homeSub), { marginTop: 6 }]}>있는 걸 먼저, 끝까지 다 쓰는 습관</T>
          </View>
          <Mascot kind="smile" size={154} />
        </View>

        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingBottom: 28 }}>
          <Card onPress={() => router.push('/register-method')} style={{ flex: 1, padding: 16, minHeight: 112, justifyContent: 'space-between' }}>
            <Icon name="camera" size={24} />
            <View>
              <T style={tx(16, 24, 800)}>제품 등록</T>
              <T style={tx(13, 18, 400, C.alt)}>사진 또는 직접 입력</T>
            </View>
          </Card>
          <Card tone="mint" onPress={() => router.push('/check')} style={{ flex: 1, padding: 16, minHeight: 112, justifyContent: 'space-between' }}>
            <Icon name="search" size={24} />
            <View>
              <T style={tx(16, 24, 800)}>구매 전 확인</T>
              <T style={tx(13, 18, 400, C.neutral)}>사기 전에 먼저 확인해요</T>
            </View>
          </Card>
        </View>

        <SectionHead title="먼저 써야 할 제품" action="전체보기" onAction={() => router.push('/first')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 20, paddingBottom: 28 }}>
          {firsts.length === 0 && <T style={[tx(14, 20, 400, C.alt), { paddingVertical: 12 }]}>지금 먼저 써야 할 제품이 없어요</T>}
          {firsts.map((p) => (
            <Card key={p.id} onPress={() => openDetail(p.id)} style={{ width: 148, padding: 12, gap: 10 }}>
              <ProdImg size={124} uri={p.imageUri} />
              <View>
                <T numberOfLines={2} style={[tx(14, 20, 500), { minHeight: 40 }]}>{p.name}</T>
                <View style={{ marginTop: 6, minHeight: 22, flexDirection: 'row' }}>{reasonOf(p) && <DBadge tone="mint">{reasonOf(p)}</DBadge>}</View>
              </View>
            </Card>
          ))}
        </ScrollView>

        <SectionHead title="사용기한 임박" />
        <View style={{ paddingHorizontal: 20, paddingBottom: 28 }}>
          <Card style={{ paddingVertical: 4 }}>
            {urgent.length === 0 && <T style={[tx(14, 20, 400, C.alt), { paddingVertical: 14, paddingHorizontal: 16 }]}>기한이 가까운 제품이 없어요</T>}
            {urgent.map((p, i) => (
              <Press key={p.id} onPress={() => openDetail(p.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 16 }}>
                {i > 0 && <Line at="top" />}
                <ProdImg size={44} radius={10} uri={p.imageUri} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T numberOfLines={1} style={tx(15, 22, 500)}>{p.name}</T>
                  <T style={tx(13, 18, 400, C.alt)}>{p.cat} · {p.opened ? '개봉' : '미개봉'}</T>
                </View>
                {ddayBadge(p.dday)}
              </Press>
            ))}
          </Card>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          <Card onPress={() => router.push({ pathname: '/records', params: { tab: 'hold' } })} style={{ paddingVertical: 16, paddingRight: 16, paddingLeft: 20, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <T style={tx(13, 18, 600, C.neutral)}>이번 달 소비 관리</T>
              <T style={[tx(17, 26, 700), { marginTop: 2 }]}>다씀 <T style={tx(17, 26, 700, C.logo)}>{dones.length}</T>개 · 구매 보류 <T style={tx(17, 26, 700, C.logo)}>{holdList.length}</T>회</T>
            </View>
            <Icon name="chevronRight" size={20} color={C.alt} />
          </Card>
        </View>
      </Scroll>
    </Screen>
  );
}
