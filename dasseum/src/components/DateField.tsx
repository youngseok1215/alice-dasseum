// 날짜 입력 필드 (iOS/Android) — 프로토타입의 <input type="date">에 해당
// 값 형식: 'YYYY-MM-DD' (빈 문자열 = 미입력)
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, View } from 'react-native';
import { C, tx } from '@/theme/tokens';
import { DButton, Hair, T } from './ui';

const toDate = (v: string) => (v ? new Date(v + 'T00:00:00') : new Date(2026, 10, 12));
const toValue = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const formatKoDate = (v: string) => (v ? v.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$1. $2. $3.') : '');

function CalendarGlyph({ color }: { color: string }) {
  // 브라우저 기본 date 입력의 달력 아이콘 모양
  return (
    <View style={{ width: 14, height: 14, borderRadius: 2, borderWidth: 1.5, borderColor: color, borderTopWidth: 4 }} />
  );
}

export function DateField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(toDate(value));
  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: toDate(value), mode: 'date', onChange: (e, d) => { if (e.type === 'set' && d) onChange(toValue(d)); } });
    } else {
      setDraft(toDate(value));
      setIosOpen(true);
    }
  };
  return (
    <>
      <Pressable onPress={open} accessibilityRole="button" style={{ height: 48, paddingHorizontal: 14, borderRadius: 12, backgroundColor: C.white, flexDirection: 'row', alignItems: 'center' }}>
        <Hair radius={12} color={iosOpen ? C.point : C.lineNeutral} width={iosOpen ? 2 : 1} />
        <T style={[tx(16, 24, 500, value ? C.ink : C.alt), { flex: 1 }]}>{value ? formatKoDate(value) : '연도. 월. 일.'}</T>
        <CalendarGlyph color={C.ink} />
      </Pressable>
      {Platform.OS === 'ios' && (
        <Modal visible={iosOpen} transparent animationType="fade" onRequestClose={() => setIosOpen(false)}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.32)', justifyContent: 'flex-end' }} onPress={() => setIosOpen(false)}>
            <Pressable style={{ backgroundColor: C.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 }}>
              <DateTimePicker value={draft} mode="date" display="inline" locale="ko-KR" accentColor={C.point} onChange={(_, d) => d && setDraft(d)} />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                {value ? <View style={{ flex: 1 }}><DButton label="지우기" variant="outlined" onPress={() => { onChange(''); setIosOpen(false); }} /></View> : null}
                <View style={{ flex: 1 }}><DButton label="확인" onPress={() => { onChange(toValue(draft)); setIosOpen(false); }} /></View>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
}
