import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/app-icon';
import { fonts, type } from '@/theme/tokens';

export default function CameraScreen() {
  const { purpose = 'check' } = useLocalSearchParams<{ purpose?: string }>();
  const register = purpose === 'register';
  const shoot = () => router.replace({ pathname: '/check/analyzing', params: { q: register ? '비타민D 2000IU' : '촬영한 사진', purpose, mode: 'photo' } });
  return <SafeAreaView style={styles.safe}><View style={styles.screen}>
    <View style={styles.header}>
      <Pressable accessibilityLabel="닫기" onPress={() => router.back()} style={styles.headerButton}><AppIcon symbol="xmark" fallback="close" size={25} color="#FFFFFF" /></Pressable>
      <Text style={styles.headerTitle}>{register ? '제품 등록' : '사진으로 확인'}</Text><View style={styles.headerButton} />
    </View>
    <View style={styles.cameraBody}>
      <View style={styles.guideFrame}>
        <View style={[styles.corner, styles.topLeft]} /><View style={[styles.corner, styles.topRight]} /><View style={[styles.corner, styles.bottomLeft]} /><View style={[styles.corner, styles.bottomRight]} />
        <View style={styles.preview}><AppIcon symbol="photo" fallback="image-outline" size={28} color="rgba(255,255,255,.7)" /><Text style={styles.previewText}>카메라 미리보기</Text></View>
      </View>
      <Text style={styles.guideText}>제품 이름이 잘 보이게 찍어주세요</Text>
    </View>
    <View style={styles.controls}>
      <Pressable accessibilityLabel="앨범에서 선택" onPress={shoot} style={styles.album}><AppIcon symbol="photo" fallback="image-outline" size={24} color="#FFFFFF" /></Pressable>
      <Pressable accessibilityLabel="촬영" onPress={shoot} style={styles.shutterOuter}><View style={styles.shutter} /></Pressable><View style={styles.albumSpacer} />
    </View>
  </View></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1B1C1E' }, screen: { flex: 1, width: '100%', maxWidth: 375, alignSelf: 'center', backgroundColor: '#1B1C1E' },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }, headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, headerTitle: { ...type.cardTitle, flex: 1, textAlign: 'center', color: '#FFFFFF', fontFamily: fonts.semibold },
  cameraBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 }, guideFrame: { width: 248, height: 300 },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: '#FFFFFF' }, topLeft: { left: 0, top: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 16 }, topRight: { right: 0, top: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 16 }, bottomLeft: { left: 0, bottom: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 16 }, bottomRight: { right: 0, bottom: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 16 },
  preview: { position: 'absolute', inset: 36, borderRadius: 14, backgroundColor: 'rgba(255,255,255,.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,.16)', alignItems: 'center', justifyContent: 'center', gap: 8 }, previewText: { ...type.caption, color: 'rgba(255,255,255,.8)', fontFamily: fonts.medium }, guideText: { ...type.itemName, color: '#FFFFFF', fontFamily: fonts.medium },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 36, paddingTop: 16, paddingBottom: 28 }, album: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(255,255,255,.12)', alignItems: 'center', justifyContent: 'center' }, albumSpacer: { width: 48 }, shutterOuter: { width: 78, height: 78, borderRadius: 39, borderWidth: 2, borderColor: 'rgba(255,255,255,.6)', alignItems: 'center', justifyContent: 'center' }, shutter: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#FFFFFF' },
});
