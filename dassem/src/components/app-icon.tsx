import Ionicons from '@expo/vector-icons/Ionicons';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { Platform, type ColorValue } from 'react-native';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export function AppIcon({ symbol, fallback, size, color }: { symbol: SymbolViewProps['name']; fallback: IoniconName; size: number; color: ColorValue }) {
  const tintColor = color === null || typeof color === 'number' ? undefined : color;

  if (Platform.OS === 'ios') return <SymbolView name={symbol} tintColor={tintColor} size={size} />;
  return <Ionicons name={fallback} color={tintColor} size={size} />;
}
