// 하단 시트 · 확인 대화상자 — 프로토타입의 dim(rgba(23,23,25,.4)) + 흰 시트/카드 오버레이
import type { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '@/theme/tokens';

const DIM = 'rgba(23,23,25,0.4)';

/** 아래에서 올라오는 시트 (손잡이 포함). 바깥을 누르면 닫힘 */
export function BottomSheet({ visible, onClose, children, padded = true }: { visible: boolean; onClose: () => void; children: ReactNode; padded?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: DIM, justifyContent: 'flex-end' }}>
        <Pressable onPress={() => {}} style={{ backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: padded ? 20 : 0, paddingBottom: 8 + insets.bottom }}>
          <View style={{ width: 36, height: 4, borderRadius: 999, backgroundColor: C.lineNeutral, alignSelf: 'center', marginBottom: padded ? 20 : 12 }} />
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** 가운데 확인 대화상자. 바깥을 눌러도 닫히지 않음 (프로토타입 삭제 확인과 동일) */
export function Dialog({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: DIM, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <View style={{ width: '100%', maxWidth: 400, backgroundColor: C.white, borderRadius: 20, paddingTop: 24, paddingHorizontal: 20, paddingBottom: 16 }}>
          {children}
        </View>
      </View>
    </Modal>
  );
}
