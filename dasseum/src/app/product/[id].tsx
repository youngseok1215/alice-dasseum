// 6. 보유 제품 상세
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { nav, Screen, Scroll, useToast } from '@/components/shell';
import { ActionArea, DBadge, DButton, ddayBadge, Hair, Icon, IconBtn, Line, T, TextBtn, TopBar } from '@/components/ui';
import { useApp } from '@/store/AppStore';
import { C, tx } from '@/theme/tokens';

export default function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { product, openToday, markDone } = useApp();
  const toast = useToast();
  const p = product(id ?? 'vitd');
  const v = tx(15, 22, 600);
  const row = (k: string, val: ReactNode) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52 }}>
      <Line at="bottom" />
      <T style={[tx(15, 22, 400, C.alt), { width: 88 }]}>{k}</T>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>{val}</View>
    </View>
  );
  const onDone = () => { markDone(p.id); router.replace({ pathname: '/done/[id]', params: { id: p.id } }); };

  return (
    <Screen>
      <TopBar title="" onBack={nav.back} right={<IconBtn name="moreVertical" label="제품 수정 및 삭제" onPress={() => router.push({ pathname: '/product/edit/[id]', params: { id: p.id } })} />} />
      <Scroll style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        <View style={{ aspectRatio: 4 / 3, borderRadius: 16, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Hair radius={16} />
          {p.imageUri
            ? <Image source={{ uri: p.imageUri }} contentFit="contain" style={{ width: '100%', height: '100%', borderRadius: 16 }} accessibilityLabel="제품 사진" />
            : <><Icon name="image" size={32} color={C.imageIcon} /><T style={tx(13, 18, 400, C.neutral)}>제품 사진</T></>}
        </View>
        <View style={{ marginTop: 20, flexDirection: 'row' }}><DBadge tone="neutral">{p.cat}</DBadge></View>
        <T style={[tx(14, 20, 400, C.alt), { marginTop: 10 }]}>{p.brand}</T>
        <T style={[tx(22, 30, 700), { marginTop: 2 }]}>{p.name}</T>
        {p.reason && (
          // 프로토타입 스타일에서 ...tx()의 margin:0이 marginTop:14를 덮어써 실제 간격은 0입니다.
          <View style={{ marginTop: 0, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: C.card }}>
            <T style={tx(14, 20, 600)}>먼저 써 보세요 · {p.reason}</T>
          </View>
        )}
        <View style={{ marginTop: 16 }}>
          {row('사용기한', p.expires ? <><T style={v}>{p.expires}</T>{ddayBadge(p.dday)}</> : ddayBadge(null))}
          {row('개봉일', p.opened ? <T style={v}>{p.opened}</T> : (
            <>
              <T style={[v, { flex: 1 }]}>미개봉</T>
              <TextBtn color={C.ink} onPress={() => { openToday(p.id); toast('개봉일을 기록했어요'); }}>오늘 개봉했어요</TextBtn>
            </>
          ))}
          {row('등록일', <T style={v}>{p.registered}</T>)}
          {p.memo ? row('메모', <T style={v}>{p.memo}</T>) : null}
        </View>
        {['영양제', '의약품'].includes(p.cat) && <T style={[tx(13, 19, 400, C.alt), { marginTop: 12 }]}>사용기한은 제품에 표기된 정보를 기준으로 해요.</T>}
      </Scroll>
      <ActionArea><DButton label="다씀" onPress={onDone} /></ActionArea>
    </Screen>
  );
}
