import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { Screen } from '@/components/screen';
import { InfoRow, LinkRow, SettingsSection, ToggleRow } from '@/components/settings-list';
import { expirySoonCount, mockProducts } from '@/data/mock-products';
import { formatExpiryDays, SIMILARITY_OPTIONS, updateSettings, useSettings } from '@/data/settings-store';
import { PRODUCT_CATEGORIES } from '@/types/product';
import { Segmented } from '@/theme/components';
import { colors, layout, radius, spacing, type } from '@/theme/tokens';

const character = require('../../../assets/dasseum/character.png');

// TODO(팀): 이동 행(카테고리 관리, 백업 등)은 화면이 정해지면 onPress에 연결하세요.
export default function SettingsScreen() {
  const settings = useSettings();
  const similarity = SIMILARITY_OPTIONS.find((option) => option.id === settings.similarity) ?? SIMILARITY_OPTIONS[1];
  const expiryDesc = settings.expiryDays.length ? `${formatExpiryDays(settings.expiryDays)}에 알려드려요` : '알림 시점을 골라주세요';

  return (
    <Screen>
      <View style={styles.header}><Text accessibilityRole="header" style={type.screenTitle}>설정</Text></View>

      <View style={styles.body}>
        <View style={styles.profile}>
          <Image source={character} contentFit="contain" style={styles.character} accessibilityLabel="다씀 캐릭터" />
          <View style={styles.profileCopy}>
            <Text style={type.tileTitle}>다씀 사용자님</Text>
            <Text style={[type.bodySm, { color: colors.textSecondary }]}>보유 물품 {mockProducts.length}개 · 기한 임박 {expirySoonCount}개</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="프로필 편집" style={styles.editBtn}>
            <AppIcon symbol="pencil" fallback="pencil" size={18} color={colors.deep} />
          </Pressable>
        </View>

        <SettingsSection title="알림">
          <ToggleRow title="유통기한 임박 알림" desc={expiryDesc} value={settings.expiryAlert} onValueChange={(v) => updateSettings({ expiryAlert: v })} />
          <ToggleRow title="중복 구매 경고" desc="비슷한 제품을 등록하면 먼저 알려드려요" value={settings.duplicateWarning} onValueChange={(v) => updateSettings({ duplicateWarning: v })} />
          <LinkRow title="알림 상세 설정" value="시간 · 주기" onPress={() => router.push('/notifications')} last />
        </SettingsSection>

        <SettingsSection title="AI 물품 도우미">
          <ToggleRow title="사진 인식 후 자동 입력" desc="촬영하면 제품명 · 유통기한을 채워요" value={settings.aiAutofill} onValueChange={(v) => updateSettings({ aiAutofill: v })} />
          <View style={styles.similarity}>
            <Text style={type.body}>비슷한 제품 판단 기준</Text>
            <Segmented options={SIMILARITY_OPTIONS} value={settings.similarity} onChange={(id) => updateSettings({ similarity: id })} />
            <Text style={[type.caption, { color: colors.textTertiary }]}>{similarity.hint}</Text>
          </View>
        </SettingsSection>

        <SettingsSection title="물품 관리">
          <LinkRow title="카테고리 관리" value={`${PRODUCT_CATEGORIES.length}개`} />
          <LinkRow title="기본 정렬" value="사용 순서 추천순" />
          <LinkRow title="다 쓴 물품 보관함" last />
        </SettingsSection>

        <SettingsSection title="데이터 · 계정">
          <LinkRow title="백업 및 동기화" />
          <LinkRow title="가족과 함께 쓰기" value="초대하기" />
          <LinkRow title="데이터 내보내기" last />
        </SettingsSection>

        <SettingsSection title="앱 정보">
          <LinkRow title="문의하기" />
          <LinkRow title="이용약관 · 개인정보 처리방침" />
          <InfoRow title="버전" value="1.0.0" last />
        </SettingsSection>

        <View style={styles.footer}>
          <Pressable accessibilityRole="button" style={styles.footerBtn}><Text style={styles.footerText}>로그아웃</Text></Pressable>
          <View style={styles.footerBar} />
          <Pressable accessibilityRole="button" style={styles.footerBtn}><Text style={styles.footerText}>회원 탈퇴</Text></Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { height: 56, justifyContent: 'center' },
  body: { gap: spacing['5xl'] },
  profile: { flexDirection: 'row', alignItems: 'center', gap: spacing['2xl'], backgroundColor: colors.sub, borderRadius: radius.banner, padding: spacing['4xl'] },
  character: { width: 72, height: 58 },
  profileCopy: { flex: 1, gap: spacing.xs },
  editBtn: { width: layout.minTouch, height: layout.minTouch, borderRadius: radius.thumb, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  similarity: { gap: spacing.lg, paddingVertical: spacing['2xl'] },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  footerBtn: { minHeight: layout.minTouch, paddingHorizontal: spacing['2xl'], justifyContent: 'center' },
  footerText: { ...type.label, color: colors.textTertiary },
  footerBar: { width: 1, height: 12, backgroundColor: colors.border },
});
