import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { Alert, Linking, Pressable, Switch, View } from 'react-native';
import { nav, Screen, Scroll, useToast } from '@/components/shell';
import { Icon, Line, Press, T, TopBar } from '@/components/ui';
import { useApp } from '@/store/AppStore';
import { C, tx } from '@/theme/tokens';

function Row({ label, value, sub, onPress, right }: { label: string; value?: string; sub?: string; onPress?: () => void; right?: ReactNode }) {
  return <Press onPress={onPress} style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 20 }}>
    <View style={{ flex: 1 }}><T style={tx(16, 24, 500)}>{label}</T>{sub && <T style={tx(13, 18, 400, C.alt)}>{sub}</T>}</View>
    {value && <T style={tx(15, 22, 400, C.alt)}>{value}</T>}
    {right}
    {onPress && !right && <Icon name="chevronRight" size={20} color={C.alt} />}
  </Press>;
}
function Group({ title, children }: { title: string; children: ReactNode }) {
  return <View style={{ marginTop: 20 }}><T style={[tx(14, 20, 600, C.alt), { paddingHorizontal: 20, marginBottom: 6 }]}>{title}</T><View style={{ backgroundColor: C.white }}><Line at="top" />{children}<Line at="bottom" /></View></View>;
}

function Chips<V extends string>({ value, onChange, items }: { value: V; onChange: (v: V) => void; items: [V, string][] }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{items.map(([v, l]) => {
    const on = v === value;
    return <Pressable key={l} onPress={() => onChange(v)} accessibilityState={{ selected: on }} style={{ height: 32, paddingHorizontal: 12, borderRadius: 999, justifyContent: 'center', backgroundColor: on ? C.card : C.white, borderWidth: on ? 0 : 1, borderColor: C.lineNeutral }}>
      <T style={tx(13, 18, on ? 700 : 500, on ? C.ink : C.neutral)}>{l}</T>
    </Pressable>;
  })}</View>;
}

export default function Settings() {
  const { nested } = useLocalSearchParams<{ nested?: string }>();
  const notificationOnly = nested === 'notifications';
  const { notifyEnabled, setNotifyEnabled, cameraPermission, devPhotoVerdict, setDevPhotoVerdict, devRegisterFail, setDevRegisterFail, reset } = useApp();
  const toast = useToast();
  const permission = cameraPermission === 'granted' ? '허용됨' : cameraPermission === 'denied' ? '꺼짐' : '요청 전';
  const change = (value: boolean) => { setNotifyEnabled(value); toast(value ? '사용기한 알림을 켰어요' : '사용기한 알림을 껐어요'); };
  return (
    <Screen tab={notificationOnly ? undefined : 'settings'}>
      {notificationOnly ? <TopBar title="알림 설정" onBack={nav.back} /> : <View style={{ height: 56, justifyContent: 'center', paddingHorizontal: 20 }}><T style={tx(22, 30, 700)}>설정</T></View>}
      <Scroll style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        <Group title="알림"><Row label="사용기한 알림" sub="기한이 가까운 제품을 알려드려요" right={<Switch value={notifyEnabled} onValueChange={change} trackColor={{ false: 'rgba(112,115,124,0.16)', true: C.point }} thumbColor="#FFFFFF" />} /></Group>
        <Group title="권한">
          <Row label="카메라" value={permission} onPress={() => Linking.openSettings()} />
          <Row label="사진" value="허용됨" onPress={() => Linking.openSettings()} />
          <Row label="알림" value={notifyEnabled ? '허용됨' : '꺼짐'} onPress={() => Linking.openSettings()} />
        </Group>
        {!notificationOnly && <Group title="정보">
          {['서비스 이용약관', '개인정보 처리방침', '의약품·영양제 정보 고지', '문의하기'].map((label) => <Row key={label} label={label} onPress={() => toast(`${label} 페이지는 준비 중이에요`)} />)}
          <Row label="앱 버전" value="1.0.0" />
        </Group>}
        {/* 개발 빌드에서만 보임 — 프로토타입 오른쪽 테스트 패널 대체. API 연결 후 삭제 */}
        {__DEV__ && !notificationOnly && <Group title="개발자 옵션 (테스트용)">
          <View style={{ paddingVertical: 12, paddingHorizontal: 20, gap: 8 }}>
            <T style={tx(14, 20, 600, C.neutral)}>사진으로 확인 결과</T>
            <Chips value={devPhotoVerdict} onChange={setDevPhotoVerdict} items={[['same', '동일'], ['similar', '유사'], ['none', '없음']]} />
            <T style={[tx(14, 20, 600, C.neutral), { marginTop: 8 }]}>제품 등록 인식 결과</T>
            <Chips value={devRegisterFail} onChange={setDevRegisterFail} items={[['', '모두 성공'], ['product', '제품 사진 실패'], ['expiry', '유통기한 실패']]} />
          </View>
          <Row
            label="모든 데이터 초기화"
            sub="내 물품과 다씀 기록을 모두 삭제해요"
            onPress={() => {
              Alert.alert(
                '모든 데이터를 초기화할까요?',
                '내 물품, 최근 확인, 구매 보류, 다씀 기록이 모두 삭제되며 되돌릴 수 없어요.',
                [
                  { text: '취소', style: 'cancel' },
                  {
                    text: '모두 삭제',
                    style: 'destructive',
                    onPress: () => {
                      void reset()
                        .then(() => {
                          if (router.canDismiss()) router.dismissAll();
                          router.replace('/');
                          toast('모든 데이터를 초기화했어요');
                        })
                        .catch((error) => toast(error instanceof Error ? error.message : '초기화하지 못했어요'));
                    },
                  },
                ],
              );
            }}
          />
        </Group>}
      </Scroll>
    </Screen>
  );
}
