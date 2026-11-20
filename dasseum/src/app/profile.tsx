// 사용자 이름 — 처음 실행 시 등록, 설정에서 변경 (로그인 없이 이름 + 서버 발급 ID로 데이터 구분)
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';
import { nav, Screen, Scroll, useToast } from '@/components/shell';
import { ActionArea, DButton, Hair, Mascot, T, TopBar } from '@/components/ui';
import { useApp } from '@/store/AppStore';
import { C, FONT, tx } from '@/theme/tokens';

export default function Profile() {
  const { mode, next } = useLocalSearchParams<{ mode?: string; next?: string }>();
  const editing = mode === 'edit';
  const { user, signIn, renameUser } = useApp();
  const toast = useToast();
  const [name, setName] = useState(editing ? user?.name ?? '' : '');
  const [focus, setFocus] = useState(false);
  const [saving, setSaving] = useState(false);
  const trimmed = name.trim();
  const ok = trimmed.length >= 1 && trimmed.length <= 20 && !saving && !(editing && trimmed === user?.name);

  const submit = async () => {
    if (!ok) return;
    setSaving(true);
    try {
      if (editing) {
        await renameUser(trimmed);
        nav.back();
        toast('이름을 바꿨어요');
        return;
      }
      await signIn(trimmed);
      if (next === 'register') router.replace('/register-method');
      else nav.reset('/home');
    } catch (error) {
      Alert.alert(editing ? '이름을 바꾸지 못했어요' : '이름을 등록하지 못했어요', error instanceof Error ? error.message : '다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      {editing ? <TopBar title="이름 변경" onBack={nav.back} /> : <View style={{ height: 56 }} />}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Scroll style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 8, paddingHorizontal: 20, paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
          {!editing && <View style={{ alignItems: 'center', marginBottom: 8 }}><Mascot kind="smile" size={140} /></View>}
          <T style={tx(24, 32, 700)}>{editing ? '새 이름을 입력해 주세요' : '이름을 알려 주세요'}</T>
          <T style={[tx(15, 22, 400, C.alt), { marginTop: 6 }]}>
            {editing ? '내 물품과 기록은 그대로 유지돼요.' : '내 물품과 기록을 이 이름으로 따로 보관해요.\n로그인 없이 이 휴대폰에서 바로 쓸 수 있어요.'}
          </T>
          <View style={{ marginTop: 28 }}>
            <T style={[tx(14, 20, 600, C.neutral), { marginBottom: 6 }]}>이름</T>
            <View style={{ height: 48, borderRadius: 12, backgroundColor: C.white, justifyContent: 'center' }}>
              <Hair radius={12} color={focus ? C.point : C.lineNeutral} width={focus ? 2 : 1} />
              <TextInput value={name} onChangeText={setName} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
                placeholder="예: 지민" placeholderTextColor={C.alt} maxLength={20} autoFocus returnKeyType="done" onSubmitEditing={submit}
                allowFontScaling={false} accessibilityLabel="이름"
                style={{ height: 48, paddingHorizontal: 14, paddingVertical: 0, fontSize: 16, fontFamily: FONT[500], letterSpacing: 0.096, color: C.ink }} />
            </View>
            <T style={[tx(12, 16, 400, C.alt), { marginTop: 6 }]}>최대 20자 · 다른 사람과 같은 이름이어도 괜찮아요</T>
          </View>
          {!editing && (
            <View style={{ marginTop: 20, padding: 14, borderRadius: 12, backgroundColor: C.fillAlt }}>
              <T style={tx(13, 19, 400, C.neutral)}>앱을 삭제하거나 휴대폰을 바꾸면 이전에 등록한 물품은 볼 수 없어요.</T>
            </View>
          )}
        </Scroll>
        <ActionArea><DButton label={saving ? '저장 중...' : editing ? '저장' : '시작하기'} disabled={!ok} onPress={submit} /></ActionArea>
      </KeyboardAvoidingView>
    </Screen>
  );
}
