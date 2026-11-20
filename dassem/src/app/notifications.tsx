import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen, TopBar } from '@/components/screen';
import { SettingsSection, ToggleRow } from '@/components/settings-list';
import { EXPIRY_DAY_OPTIONS, formatExpiryDays, NOTIFY_TIMES, toggleExpiryDay, updateSettings, useSettings } from '@/data/settings-store';
import { AiNote } from '@/theme/components';
import { colors, radius, spacing, type } from '@/theme/tokens';

export default function NotificationsScreen() {
  const settings = useSettings();
  const time = NOTIFY_TIMES.find((option) => option.id === settings.notifyTime) ?? NOTIFY_TIMES[0];
  const preview = !settings.expiryAlert
    ? '유통기한 임박 알림이 꺼져 있어요'
    : settings.expiryDays.length
      ? `유통기한 ${formatExpiryDays(settings.expiryDays)}, ${time.time}에 알려드려요`
      : '유통기한 알림 시점을 하나 이상 골라주세요';

  return (
    <Screen>
      <TopBar title="알림 상세 설정" />
      <View style={styles.body}>
        <AiNote eyebrow="미리 보기" text={preview} />

        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>유통기한 알림 시점</Text>
          <View style={styles.card}>
            <Text style={[type.caption, { color: colors.textTertiary }]}>여러 개를 고를 수 있어요</Text>
            <View style={styles.days}>
              {EXPIRY_DAY_OPTIONS.map((day) => {
                const on = settings.expiryDays.includes(day);
                return (
                  <Pressable
                    key={day}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    onPress={() => toggleExpiryDay(day)}
                    style={[styles.day, { backgroundColor: on ? colors.sub : colors.background, borderColor: on ? colors.deep : colors.border }]}>
                    <Text style={[type.itemName, { color: on ? colors.deep : colors.textSecondary }]}>D-{day}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>알림 받을 시간</Text>
          <View style={[styles.card, styles.times]}>
            {NOTIFY_TIMES.map((option) => {
              const on = option.id === settings.notifyTime;
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => updateSettings({ notifyTime: option.id })}
                  style={[styles.time, { backgroundColor: on ? colors.deep : 'transparent' }]}>
                  <Text style={[type.caption, { color: on ? colors.onPrimary : colors.text }]}>{option.label}</Text>
                  <Text style={[type.cardTitle, { color: on ? colors.onPrimary : colors.text }]}>{option.time}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <SettingsSection title="그 밖의 알림">
          <ToggleRow title="개봉 후 사용기한 알림" desc="화장품은 개봉 후 6~12개월이 기준이에요" value={settings.openedAlert} onValueChange={(v) => updateSettings({ openedAlert: v })} />
          <ToggleRow title="사용 순서 추천 알림" desc="먼저 써야 할 물품을 주 1회 알려드려요" value={settings.orderAlert} onValueChange={(v) => updateSettings({ orderAlert: v })} />
          <ToggleRow title="월간 절약 리포트" desc="매달 1일, 아낀 금액을 정리해 드려요" value={settings.monthlyReport} onValueChange={(v) => updateSettings({ monthlyReport: v })} last />
        </SettingsSection>

        <SettingsSection title="방해 금지">
          <ToggleRow title="밤에는 알림 끄기" desc="오후 10시 ~ 오전 8시" value={settings.quietHours} onValueChange={(v) => updateSettings({ quietHours: v })} last />
        </SettingsSection>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing['5xl'], paddingTop: spacing.xl },
  section: { gap: spacing.md },
  sectionTitle: { ...type.label, fontFamily: 'Pretendard-Bold', color: colors.textSecondary, paddingHorizontal: spacing.xs },
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: spacing['3xl'], gap: spacing.xl, backgroundColor: colors.background },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  day: { height: 40, paddingHorizontal: spacing['3xl'], borderRadius: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  times: { flexDirection: 'row', padding: spacing.xs, gap: spacing.xs },
  time: { flex: 1, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: spacing.xxs },
});
