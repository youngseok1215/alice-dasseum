// 2. 구매 전 확인
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, TextInput, View, type TextInputInstance } from 'react-native';
import { Screen, Scroll } from '@/components/shell';
import { DButton, Hair, Icon, IconBtn, Line, Press, T } from '@/components/ui';
import { useApp } from '@/store/AppStore';
import { C, FONT, tx } from '@/theme/tokens';

async function startSearch(q: string, setQuery: (q: string) => void, addRecent: (q: string) => void, refreshProducts: () => Promise<void>) {
  setQuery(q);
  addRecent(q);
  await refreshProducts();
  router.push({ pathname: '/analyzing', params: { mode: 'search', q } });
}

export default function Check() {
  const { query, setQuery, recents, addRecent, removeRecent, refreshProducts } = useApp();
  const ref = useRef<TextInputInstance>(null);
  const [focus, setFocus] = useState(false);
  const submit = (q?: string) => {
    const v = (q ?? query).trim();
    if (!v) return;
    startSearch(v, setQuery, addRecent, refreshProducts);
  };

  return (
    <Screen tab="check">
      <Scroll contentContainerStyle={{ paddingBottom: 28 }}>
        <View style={{ paddingTop: 16, paddingHorizontal: 20 }}>
          <T style={tx(24, 32, 700)}>구매 전 확인</T>
          <T style={[tx(15, 22, 400, C.alt), { marginTop: 4 }]}>사기 전에 내 물품에 있는지 확인해요</T>
        </View>
        <View style={{ height: 20 }} />
        <View style={{ paddingHorizontal: 20, gap: 10 }}>
          <Pressable onPress={() => ref.current?.focus()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, paddingLeft: 14, paddingRight: 8, borderRadius: 12, backgroundColor: C.white }}>
            <Hair radius={12} color={focus ? C.point : C.lineNeutral} width={focus ? 2 : 1} />
            <Icon name="search" size={20} color={C.alt} />
            <TextInput
              ref={ref}
              value={query}
              onChangeText={setQuery}
              onFocus={() => setFocus(true)}
              onBlur={() => setFocus(false)}
              placeholder="제품명이나 브랜드를 입력하세요"
              placeholderTextColor="rgba(117,117,117,1)"
              returnKeyType="search"
              enterKeyHint="search"
              onSubmitEditing={() => submit()}
              allowFontScaling={false}
              style={{ flex: 1, minWidth: 0, fontSize: 16, lineHeight: 24, height: 24, padding: 0, fontFamily: FONT[400], letterSpacing: 0.096, color: C.ink }}
            />
            {query ? (
              <Pressable accessibilityLabel="지우기" onPress={() => setQuery('')} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="circleCloseFill" size={20} color={C.assist} />
              </Pressable>
            ) : null}
          </Pressable>
          <DButton label="확인하기" disabled={!query.trim()} onPress={() => submit()} />
          <DButton label="사진으로 확인하기" variant="outlined" icon="camera" onPress={() => router.push('/camera')} />
        </View>

        <View style={{ paddingTop: 32, paddingHorizontal: 20 }}>
          <T style={[tx(17, 24, 600), { marginBottom: 4 }]}>최근 확인</T>
          {recents.length === 0 && <T style={[tx(14, 20, 400, C.alt), { paddingVertical: 12 }]}>최근 확인한 제품이 없어요</T>}
          {recents.map((r, i) => (
            <View key={r.q} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {i > 0 && <Line at="top" />}
              <Press onPress={() => submit(r.q)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 }}>
                <Icon name="history" size={20} color={C.alt} />
                <T style={[tx(15, 22, 400), { flex: 1 }]}>{r.q}</T>
                <T style={tx(13, 18, 400, C.alt)}>{r.date}</T>
              </Press>
              <IconBtn name="close" label={r.q + ' 삭제'} color={C.alt} onPress={() => removeRecent(r.q)} />
            </View>
          ))}
        </View>
      </Scroll>
    </Screen>
  );
}
