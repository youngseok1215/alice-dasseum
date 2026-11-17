// 6. 보유 제품 상세
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useState, type ReactNode } from 'react';
import { Alert, Platform, View } from 'react-native';
import { BottomSheet, Dialog } from '@/components/overlay';
import { nav, Screen, Scroll, useToast } from '@/components/shell';
import { ActionArea, DBadge, DButton, ddayBadge, Hair, Icon, IconBtn, Line, Press, T, TextBtn, TopBar } from '@/components/ui';
import { reasonOf } from '@/data/products';
import { useApp } from '@/store/AppStore';
import { C, tx } from '@/theme/tokens';

export default function Detail() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const { product, openToday, markDone, deleteProduct } = useApp();
  const toast = useToast();
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const p = product(id ?? 'vitd');
  const reason = reasonOf(p);
  const v = tx(15, 22, 600);
  const row = (k: string, val: ReactNode) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52 }}>
      <Line at="bottom" />
      <T style={[tx(15, 22, 400, C.alt), { width: 88 }]}>{k}</T>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>{val}</View>
    </View>
  );
  const onDone = async () => {
    try {
      await markDone(p.id);
      router.replace({ pathname: '/done/[id]', params: { id: p.id, ...(from ? { from } : {}) } });
    } catch (error) {
      Alert.alert('다씀으로 기록하지 못했어요', error instanceof Error ? error.message : '다시 시도해 주세요.');
    }
  };
  // 프로토타입 onDelete: 내 물품 탭으로 이동 + 토스트
  const onDelete = async () => {
    try {
      await deleteProduct(p.id);
      setConfirm(false);
      nav.reset('/items');
      toast('제품을 삭제했어요');
    } catch (error) {
      Alert.alert('제품을 삭제하지 못했어요', error instanceof Error ? error.message : '다시 시도해 주세요.');
    }
  };
  const onEdit = () => { setMenu(false); router.push({ pathname: '/recognized', params: { edit: p.id } }); };

  return (
    <Screen>
      <TopBar title="" onBack={nav.back} right={<IconBtn name="moreVertical" label="더보기" onPress={() => setMenu(true)} />} />
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
        {p.reason && reason && (
          // 프로토타입 스타일에서 ...tx()의 margin:0이 marginTop:14를 덮어써 실제 간격은 0입니다.
          <View style={{ marginTop: 0, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: C.card }}>
            <T style={tx(14, 20, 600)}>먼저 써 보세요 · {reason}</T>
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

      {/* 더보기: 수정 · 삭제 */}
      <BottomSheet visible={menu} onClose={() => setMenu(false)} padded={false}>
        <Press onPress={onEdit} style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 20 }}>
          <T style={tx(16, 24, 500)}>수정</T><Icon name="pencil" size={20} color={C.alt} />
        </Press>
        <Press onPress={() => { setMenu(false); setTimeout(() => setConfirm(true), Platform.OS === 'ios' ? 350 : 0); }} style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 20 }}>
          <T style={tx(16, 24, 500, C.red40)}>삭제</T><Icon name="trash" size={20} color={C.red40} />
        </Press>
        <View style={{ paddingTop: 8, paddingHorizontal: 20 }}><DButton label="닫기" variant="outlined" onPress={() => setMenu(false)} /></View>
      </BottomSheet>

      {/* 삭제 확인 */}
      <Dialog visible={confirm} onClose={() => setConfirm(false)}>
        <T style={tx(18, 26, 700)}>제품을 삭제할까요?</T>
        <T style={[tx(15, 22, 400, C.alt), { marginTop: 6 }]}>다씀 기록에는 남지 않아요.</T>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}>
          <View style={{ flex: 1 }}><DButton label="취소" variant="outlined" onPress={() => setConfirm(false)} /></View>
          <Press onPress={onDelete} radius={12} accessibilityLabel="삭제" style={{ flex: 1, height: 48, backgroundColor: C.red40, alignItems: 'center', justifyContent: 'center' }}>
            <T style={tx(16, 24, 600, '#FFFFFF')}>삭제</T>
          </Press>
        </View>
      </Dialog>
    </Screen>
  );
}
