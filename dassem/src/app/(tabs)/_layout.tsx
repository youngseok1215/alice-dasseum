import { Tabs } from 'expo-router';
import { View, type ColorValue } from 'react-native';
import { AppIcon } from '@/components/app-icon';
import { Toast } from '@/components/toast';
import { colors, fonts, layout } from '@/theme/tokens';

function TabIcon({ route, focused, color }: { route: string; focused: boolean; color: ColorValue }) {
  if (route === 'index') return <AppIcon symbol={focused ? 'house.fill' : 'house'} fallback={focused ? 'home' : 'home-outline'} color={color} size={24} />;
  if (route === 'check') return <AppIcon symbol="magnifyingglass" fallback="search" color={color} size={24} />;
  if (route === 'items') return <AppIcon symbol="archivebox" fallback="file-tray-outline" color={color} size={24} />;
  return <AppIcon symbol={focused ? 'gearshape.fill' : 'gearshape'} fallback={focused ? 'settings' : 'settings-outline'} color={color} size={24} />;
}
export default function TabsLayout() {
  return <View style={{ flex: 1 }}><Tabs screenOptions={({ route }) => ({
    headerShown: false, tabBarActiveTintColor: colors.text, tabBarInactiveTintColor: 'rgba(55,56,60,.45)',
    tabBarLabelStyle: { fontSize: 11, lineHeight: 14, fontFamily: fonts.semibold, letterSpacing: .33 },
    tabBarStyle: { height: layout.tabBarHeight, paddingTop: 6, paddingBottom: 10, borderTopColor: colors.divider, backgroundColor: colors.surface },
    tabBarIcon: ({ color, focused }) => <TabIcon route={route.name} focused={focused} color={color} />,
  })}>
    <Tabs.Screen name="index" options={{ title: '홈' }} />
    <Tabs.Screen name="check" options={{ title: '구매 전 확인' }} />
    <Tabs.Screen name="items" options={{ title: '내 제품' }} />
    <Tabs.Screen name="settings" options={{ title: '설정' }} />
  </Tabs><Toast /></View>;
}
