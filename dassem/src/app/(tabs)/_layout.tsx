import { Tabs } from 'expo-router';
import { View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { Toast } from '@/components/toast';
import { colors, fonts, layout, type } from '@/theme/tokens';

const icons = { index: ['house.fill', 'home'] as const, items: ['archivebox.fill', 'file-tray-full'] as const, settings: ['gearshape.fill', 'settings'] as const };

export default function TabsLayout() {
  return <View style={{ flex: 1 }}>
    <Tabs screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: colors.deep,
      tabBarInactiveTintColor: colors.textDisabled,
      tabBarLabelStyle: { ...type.tabLabel, fontFamily: fonts.bold },
      tabBarStyle: { height: layout.tabBarHeight, paddingTop: 8, paddingBottom: 24, borderTopColor: colors.divider, backgroundColor: colors.background },
      tabBarIcon: ({ color }) => { const icon = icons[route.name as keyof typeof icons]; return <AppIcon symbol={icon[0]} fallback={icon[1]} color={color} size={26} />; },
    })}>
      <Tabs.Screen name="index" options={{ title: '홈' }} />
      <Tabs.Screen name="items" options={{ title: '내 물품' }} />
      <Tabs.Screen name="settings" options={{ title: '설정' }} />
    </Tabs>
    {/* 결과 화면 등에서 showToast()로 띄우는 완료 알림 */}
    <Toast />
  </View>;
}
