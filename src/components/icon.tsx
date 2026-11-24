import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import type { ColorValue } from 'react-native';

import { C } from '@/lib/theme';

export type IconName = { ios: SFSymbol; android: AndroidSymbol };

export function Icon({ name, size = 20, color = C.cream }: { name: IconName; size?: number; color?: ColorValue }) {
  return <SymbolView name={{ ...name, web: name.android }} size={size} tintColor={color} />;
}
