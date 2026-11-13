import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { Screen } from '@/components/screen';
import { addRecent, removeRecent, useAppStore } from '@/data/app-store';
import { colors, fonts, type } from '@/theme/tokens';

const dates: Record<string, string> = {
  '데일리 선크림 SPF50+': '11.08',
  '약산성 진정 토너': '11.03',
};

export default function CheckScreen() {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const { recent } = useAppStore();
  const submit = (value = query) => {
    const q = value.trim();
    if (!q) return;
    addRecent(q);
    router.push({ pathname: '/check/analyzing', params: { q } });
  };

  return <Screen>
    <View style={styles.heading}>
      <Text style={styles.title}>구매 전 확인</Text>
      <Text style={styles.subtitle}>사기 전에 내 물품에 있는지 확인해요</Text>
    </View>

    <View style={styles.form}>
      <View style={[styles.search, focused && styles.searchFocused]}>
        <AppIcon symbol="magnifyingglass" fallback="search" size={20} color={colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={() => submit()}
          returnKeyType="search"
          placeholder="제품명이나 브랜드를 입력하세요"
          placeholderTextColor={colors.textDisabled}
          style={styles.input}
        />
        {Boolean(query) && <Pressable accessibilityLabel="지우기" onPress={() => setQuery('')} style={styles.clear}><AppIcon symbol="xmark.circle.fill" fallback="close-circle" size={20} color={colors.textDisabled} /></Pressable>}
      </View>
      <Pressable disabled={!query.trim()} onPress={() => submit()} style={[styles.button, !query.trim() && styles.buttonDisabled]}><Text style={[styles.buttonText, !query.trim() && styles.buttonTextDisabled]}>확인하기</Text></Pressable>
      <Pressable onPress={() => router.push({ pathname: '/check/camera', params: { purpose: 'check' } })} style={[styles.button, styles.outlined]}><AppIcon symbol="camera" fallback="camera-outline" size={20} color={colors.text} /><Text style={styles.buttonText}>사진으로 확인하기</Text></Pressable>
    </View>

    <View style={styles.recentSection}>
      <Text style={styles.recentTitle}>최근 확인</Text>
      {recent.length === 0 && <Text style={styles.empty}>최근 확인한 제품이 없어요</Text>}
      {recent.map((item, index) => <View key={item} style={[styles.recentRow, index > 0 && styles.divided]}>
        <Pressable onPress={() => submit(item)} style={styles.recentMain}>
          <AppIcon symbol="clock.arrow.circlepath" fallback="time-outline" size={20} color={colors.textSecondary} />
          <Text numberOfLines={1} style={styles.recentName}>{item}</Text>
          <Text style={styles.recentDate}>{dates[item] ?? '11.12'}</Text>
        </Pressable>
        <Pressable accessibilityLabel={`${item} 삭제`} onPress={() => removeRecent(item)} style={styles.delete}><AppIcon symbol="xmark" fallback="close" size={20} color={colors.textSecondary} /></Pressable>
      </View>)}
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  heading: { paddingTop: 16, marginBottom: 28 },
  title: { ...type.screenTitle, fontSize: 24, lineHeight: 32, fontFamily: fonts.bold },
  subtitle: { ...type.body, fontSize: 15, lineHeight: 22, color: colors.textSecondary, fontFamily: fonts.medium, marginTop: 4 },
  form: { gap: 10 },
  search: { height: 48, paddingLeft: 14, paddingRight: 8, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#D7DBD9', flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchFocused: { borderWidth: 2, borderColor: colors.deep, paddingLeft: 13, paddingRight: 7 },
  input: { ...type.body, flex: 1, fontSize: 16, lineHeight: 24, fontFamily: fonts.medium, color: colors.text, paddingVertical: 0 },
  clear: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  button: { minHeight: 52, borderRadius: 14, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 },
  buttonDisabled: { backgroundColor: '#F1F1F2' },
  outlined: { backgroundColor: colors.background, borderWidth: 1, borderColor: '#D7DBD9' },
  buttonText: { ...type.button, fontFamily: fonts.bold, color: colors.text },
  buttonTextDisabled: { color: '#B2B3B6' },
  recentSection: { paddingTop: 32 },
  recentTitle: { ...type.cardTitle, fontSize: 17, lineHeight: 24, fontFamily: fonts.bold, marginBottom: 4 },
  recentRow: { flexDirection: 'row', alignItems: 'center' },
  divided: { borderTopWidth: 1, borderTopColor: colors.divider },
  recentMain: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10 },
  recentName: { ...type.itemName, flex: 1, fontSize: 15, lineHeight: 22, fontFamily: fonts.medium },
  recentDate: { ...type.caption, color: colors.textSecondary, fontFamily: fonts.medium },
  delete: { width: 44, height: 44, alignItems: 'center', justifyContent: 'flex-end', flexDirection: 'row' },
  empty: { ...type.bodySm, color: colors.textSecondary, paddingVertical: 12 },
});
