import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { DAILY_LIMIT } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { useRemainingToday } from '@/lib/quota';
import { C } from '@/lib/theme';

const PRIVACY_URL = 'https://example.com/privacy'; // TODO: hosted privacy policy page
const TERMS_URL = 'https://example.com/terms'; // TODO: hosted terms of service page
const SUPPORT_EMAIL = 'support@example.com'; // TODO: real support inbox
const SHARE_URL = 'https://example.com'; // TODO: App Store / Play Store link

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="px-1 text-xs font-medium uppercase tracking-wider text-faint">{title}</Text>
      <View className="overflow-hidden rounded-3xl border border-line bg-surface">{children}</View>
    </View>
  );
}

function Row({ icon, label, onPress, danger, loading, last }: { icon: IconName; label: string; onPress: () => void; danger?: boolean; loading?: boolean; last?: boolean }) {
  const color = danger ? C.danger : C.cream;
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      className={`h-14 flex-row items-center gap-3 px-4 active:bg-elevated ${last ? '' : 'border-b border-line'}`}>
      <Icon name={icon} size={18} color={danger ? C.danger : C.muted} />
      <Text className="flex-1 text-base" style={{ color }}>
        {label}
      </Text>
      {loading ? <ActivityIndicator color={color} /> : <Icon name={{ ios: 'chevron.right', android: 'chevron_right' }} size={14} color={C.faint} />}
    </Pressable>
  );
}

export default function Profile() {
  const insets = useSafeAreaInsets();
  const { data: session } = authClient.useSession();
  const remaining = useRemainingToday();
  const [busy, setBusy] = useState<'signOut' | 'delete' | null>(null);

  async function deleteAccount() {
    setBusy('delete');
    const { error } = await authClient.deleteUser();
    setBusy(null);
    if (!error) return;
    const message = error.message ?? 'Try again.';
    if (Platform.OS === 'web') window.alert(`Could not delete account\n\n${message}`); // Alert.alert is a no-op on web
    else Alert.alert('Could not delete account', message);
  }

  function confirmDelete() {
    const title = 'Delete account?';
    const message = 'This permanently deletes your account and every design you have made. This cannot be undone.';
    // Alert.alert is a no-op on web.
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${message}`)) deleteAccount();
      return;
    }
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: deleteAccount },
    ]);
  }

  const user = session?.user;
  const used = remaining === null ? 0 : DAILY_LIMIT - remaining;

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingTop: Platform.OS === 'android' ? insets.top + 8 : 8, paddingBottom: 32, paddingHorizontal: 20, gap: 24 }}>
      <Text className="text-3xl font-semibold tracking-tight text-cream">Profile</Text>

      <View className="flex-row items-center gap-4">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-accent">
          <Text className="text-2xl font-semibold text-accent-ink">{(user?.name || user?.email)?.charAt(0).toUpperCase()}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-xl font-semibold text-cream">{user?.name || 'Your account'}</Text>
          <Text className="mt-0.5 text-sm text-muted" numberOfLines={1}>
            {user?.email}
          </Text>
        </View>
      </View>

      <View className="gap-4 rounded-3xl border border-line bg-surface p-5">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-medium text-muted">Today’s designs</Text>
          <Icon name={{ ios: 'sparkles', android: 'auto_awesome' }} size={16} color={C.accent} />
        </View>
        <Text className="text-3xl font-semibold tracking-tight text-cream">
          {remaining ?? '–'} <Text className="text-lg font-normal text-muted">of {DAILY_LIMIT} left</Text>
        </Text>
        <View className="flex-row gap-1.5">
          {Array.from({ length: DAILY_LIMIT }, (_, i) => (
            <View key={i} className={`h-1.5 flex-1 rounded-full ${i < DAILY_LIMIT - used ? 'bg-accent' : 'bg-elevated'}`} />
          ))}
        </View>
        <Text className="text-xs text-faint">Resets every day at 00:00 UTC.</Text>
      </View>

      {Platform.OS !== 'web' && (
        <Section title="Preferences">
          {/* Notification permissions live in system settings; this opens the app's page there. */}
          <Row icon={{ ios: 'bell', android: 'notifications' }} label="Notifications" last onPress={() => Linking.openSettings()} />
        </Section>
      )}

      <Section title="Support">
        <Row
          icon={{ ios: 'envelope', android: 'mail' }}
          label="Contact support"
          onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Restyle feedback (v${Constants.expoConfig?.version})`)}`)}
        />
        <Row
          icon={{ ios: 'square.and.arrow.up', android: 'share' }}
          label="Share Restyle"
          last
          onPress={() => Share.share({ message: `Redesign any room with AI — try Restyle: ${SHARE_URL}` })}
        />
      </Section>

      <Section title="Legal">
        <Row icon={{ ios: 'hand.raised', android: 'shield' }} label="Privacy policy" onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)} />
        <Row icon={{ ios: 'doc.text', android: 'description' }} label="Terms of service" last onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)} />
      </Section>

      <Section title="Account">
        <Row
          icon={{ ios: 'rectangle.portrait.and.arrow.right', android: 'logout' }}
          label="Sign out"
          loading={busy === 'signOut'}
          onPress={async () => {
            setBusy('signOut');
            await authClient.signOut();
            setBusy(null);
          }}
        />
        <Row icon={{ ios: 'trash', android: 'delete_forever' }} label="Delete account" danger loading={busy === 'delete'} last onPress={confirmDelete} />
      </Section>

      <Text className="text-center text-xs text-faint">Version {Constants.expoConfig?.version}</Text>
    </ScrollView>
  );
}
