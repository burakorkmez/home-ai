import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { C } from '@/lib/theme';

const VARIANTS = {
  primary: { box: 'bg-accent', text: 'text-accent-ink', spinner: C.accentInk },
  secondary: { box: 'bg-elevated border border-line', text: 'text-cream', spinner: C.cream },
  light: { box: 'bg-cream', text: 'text-accent-ink', spinner: C.accentInk },
  danger: { box: 'bg-danger/15 border border-danger/30', text: 'text-danger', spinner: C.danger },
};

type Props = {
  title: string;
  onPress: () => void;
  variant?: keyof typeof VARIANTS;
  icon?: ReactNode;
  arrow?: boolean; // the round "→" badge from the reference design
  loading?: boolean;
  disabled?: boolean;
};

export function Button({ title, onPress, variant = 'primary', icon, arrow, loading, disabled }: Props) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      className={`h-14 justify-center rounded-full active:opacity-80 ${v.box} ${disabled ? 'opacity-40' : ''}`}>
      <View className="flex-row items-center justify-center gap-2.5 px-14">
        {(icon || loading) && (
          <View className="h-7 w-7 items-center justify-center">{loading ? <ActivityIndicator color={v.spinner} /> : icon}</View>
        )}
        <Text className={`text-[18px] font-semibold ${v.text}`}>{title}</Text>
      </View>
      {arrow && (
        <View className="absolute inset-y-0 right-2 justify-center">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-accent-ink">
            <Icon name={{ ios: 'arrow.right', android: 'arrow_forward' }} size={18} color={C.accent} />
          </View>
        </View>
      )}
    </Pressable>
  );
}
