import Ionicons from '@expo/vector-icons/Ionicons';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { Platform, type ColorValue } from 'react-native';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export function AppIcon({ symbol, fallback, size, color }: { symbol: SymbolViewProps['name']; fallback: IoniconName; size: number; color: ColorValue }) {
  if (Platform.OS === 'ios') return <SymbolView name={symbol} tintColor={color} size={size} />;
  return <Ionicons name={fallback} color={color} size={size} />;
}
