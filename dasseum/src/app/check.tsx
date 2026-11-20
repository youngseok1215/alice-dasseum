// 2. 구매 전 확인
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, TextInput, View, type TextInputInstance } from 'react-native';
import { Screen, Scroll } from '@/components/shell';
import { DButton, Hair, Icon, IconBtn, Line, Press, ProdImg, T } from '@/components/ui';
import { useOpenCamera } from '@/hooks/use-open-camera';
import { useApp } from '@/store/AppStore';
import { C, FONT, tx } from '@/theme/tokens';

function startSearch(q: string, setQuery: (q: string) => void, addRecent: (q: string) => void) {
  setQuery(q);
  addRecent(q);
  router.push({ pathname: '/analyzing', params: { mode: 'search', q } });
}

function searchable(value: string) {
  return value.normalize('NFKC').toLowerCase().replace(/\s/g, '');
}

export default function Check() {
  const openCamera = useOpenCamera();
  const { query, setQuery, recents, addRecent, removeRecent, products, completed } = useApp();
  const ref = useRef<TextInputInstance>(null);
  const [focus, setFocus] = useState(false);
  const keyword = searchable(query.trim());
  const suggestions = keyword
    ? products()
        .filter((product) => !completed.includes(product.id))
        .map((product) => ({
          product,
          position: searchable(`${product.brand} ${product.name}`).indexOf(keyword),
        }))
        .filter(({ position }) => position >= 0)
        .sort((left, right) => left.position - right.position || left.product.name.localeCompare(right.product.name, 'ko'))
        .slice(0, 5)
        .map(({ product }) => product)
    : [];
  const submit = (q?: string) => {
    const v = (q ?? query).trim();
    if (!v) return;
    startSearch(v, setQuery, addRecent);
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
          {suggestions.length > 0 && (
            <View style={{ borderRadius: 12, backgroundColor: C.white, overflow: 'hidden' }}>
              <Hair radius={12} color={C.lineNeutral} />
              <T style={[tx(13, 18, 600, C.alt), { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 }]}>내 물품 연관 검색어</T>
              {suggestions.map((product, index) => (
                <View key={product.id}>
                  {index > 0 && <Line at="top" />}
                  <Press
                    accessibilityLabel={`${product.name} 검색`}
                    onPress={() => submit(product.name)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 9 }}
                  >
                    <ProdImg size={40} radius={8} uri={product.imageUri} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <T numberOfLines={1} style={tx(15, 22, 600)}>{product.name}</T>
                      <T numberOfLines={1} style={[tx(12, 17, 400, C.alt), { marginTop: 1 }]}>
                        {[product.brand, product.cat].filter(Boolean).join(' · ')}
                      </T>
                    </View>
                    <Icon name="chevronRight" size={18} color={C.alt} />
                  </Press>
                </View>
              ))}
            </View>
          )}
          <DButton label="확인하기" disabled={!query.trim()} onPress={() => submit()} />
          <DButton label="사진으로 확인하기" variant="outlined" icon="camera" onPress={() => openCamera()} />
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
