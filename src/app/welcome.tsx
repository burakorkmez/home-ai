import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BeforeAfter } from '@/components/before-after';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { SAMPLE_LIVING } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { STYLES } from '@/lib/catalog';
import { C } from '@/lib/theme';

const HERO_AFTER = STYLES.find((s) => s.id === 'modern')!.image;

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState<'apple' | 'google' | null>(null);

  async function social(provider: 'apple' | 'google') {
    setBusy(provider);
    const { error } = await authClient.signIn.social({ provider });
    setBusy(null);
    if (error) Alert.alert('Sign in failed', error.message);
  }

  return (
    <View className="flex-1 bg-bg">
      <View style={{ height: '60%' }}>
        <BeforeAfter before={SAMPLE_LIVING} after={HERO_AFTER} autoPlay rounded={false} labels={false} />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: '50%',
            backgroundImage: `linear-gradient(to bottom, transparent, ${C.bg})`,
          }}
        />
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, right: 0, top: 0, height: insets.top + 90, backgroundImage: 'linear-gradient(to bottom, rgba(10,8,6,0.7), transparent)' }}
        />
        <View
          pointerEvents="none"
          className="absolute left-6 flex-row items-center gap-2.5"
          style={{ top: insets.top + 12 }}>
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-black/40">
            <Icon name={{ ios: 'house', android: 'home' }} size={18} color={C.accent} />
          </View>
          <View>
            <Text className="text-base font-semibold text-cream">Restyle</Text>
            <Text className="text-xs font-medium uppercase tracking-[2px] text-cream/70">AI Interiors</Text>
          </View>
        </View>
      </View>

      <View className="-mt-10 flex-1 justify-end gap-3 px-6" style={{ paddingBottom: insets.bottom + 12 }}>
        <Text className="mb-4 text-[50px] font-semibold leading-[56px] tracking-tight text-cream">
          Your room,{'\n'}beautifully{'\n'}reimagined
        </Text>

        {Platform.OS === 'ios' && (
          <Button
            variant="light"
            title="Continue with Apple"
            icon={<Icon name={{ ios: 'apple.logo', android: 'person' }} size={24} color={C.accentInk} />}
            loading={busy === 'apple'}
            disabled={!!busy}
            onPress={() => social('apple')}
          />
        )}
        <Button
          variant="secondary"
          title="Continue with Google"
          icon={<Image source={require('@/assets/images/google-g.png')} style={{ width: 22, height: 22 }} />}
          loading={busy === 'google'}
          disabled={!!busy}
          onPress={() => social('google')}
        />
        <Button
          title="Continue with email"
          icon={<Icon name={{ ios: 'envelope.fill', android: 'mail' }} size={22} color={C.accentInk} />}
          arrow
          disabled={!!busy}
          onPress={() => router.push('/sign-in')}
        />

        <Text className="mt-1 text-center text-xs leading-5 text-faint">
          By continuing you agree to our Terms and Privacy Policy.
        </Text>
      </View>
    </View>
  );
}
