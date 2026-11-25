import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { authClient } from '@/lib/auth-client';
import { C } from '@/lib/theme';

type Mode = 'signIn' | 'signUp' | 'reset';

const COPY = {
  signIn: { title: 'Welcome back', sub: 'Sign in to see your designs.', cta: 'Sign in' },
  signUp: { title: 'Create account', sub: 'Five free redesigns every day.', cta: 'Create account' },
  reset: { title: 'Reset password', sub: "We'll email you a link to set a new password.", cta: 'Send reset link' },
};

function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-muted">{label}</Text>
      <TextInput
        placeholderTextColor={C.faint}
        selectionColor={C.accent}
        className="h-14 rounded-2xl border border-line bg-surface px-4 text-base text-cream"
        {...props}
      />
    </View>
  );
}

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const switchMode = (m: Mode) => {
    if (loading) return; // a pending request would land on the wrong form
    setMode(m);
    setError('');
    setResetSent(false);
  };

  async function submit() {
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address.');
    if (mode === 'signUp' && !name.trim()) return setError('Enter your name.');
    if (mode !== 'reset' && password.length < 8) return setError('Password must be at least 8 characters.');
    setError('');
    setLoading(true);
    try {
      const { error } =
        mode === 'signIn'
          ? await authClient.signIn.email({ email, password })
          : mode === 'signUp'
            ? await authClient.signUp.email({ name: name.trim(), email, password })
            : await authClient.requestPasswordReset({ email, redirectTo: '/api/reset-password' });
      if (error) return setError(error.message ?? 'Something went wrong. Try again.');
      if (mode === 'reset') setResetSent(true);
    } catch {
      setError('Something went wrong. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
    // On sign-in the auth gate in _layout swaps to the tabs automatically.
  }

  const copy = COPY[mode];

  return (
    <KeyboardAvoidingView className="flex-1 bg-bg" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16, paddingHorizontal: 24 }}>
        <Pressable
          onPress={() => (mode === 'reset' ? switchMode('signIn') : router.back())}
          accessibilityLabel="Back"
          className="-ml-1 mb-8 h-11 w-11 items-center justify-center rounded-full bg-surface active:opacity-70">
          <Icon name={{ ios: 'chevron.left', android: 'arrow_back' }} size={18} />
        </Pressable>

        <Text className="text-3xl font-semibold tracking-tight text-cream">{copy.title}</Text>
        <Text className="mb-8 mt-2 text-base text-muted">{copy.sub}</Text>

        {resetSent ? (
          <View className="items-center gap-3 rounded-3xl border border-line bg-surface p-6">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-accent/15">
              <Icon name={{ ios: 'envelope.fill', android: 'mail' }} size={24} color={C.accent} />
            </View>
            <Text className="text-lg font-semibold text-cream">Check your inbox</Text>
            <Text className="text-center text-sm leading-5 text-muted">
              If an account exists for {email}, a reset link is on its way.
            </Text>
            <View className="mt-2 self-stretch">
              <Button variant="secondary" title="Back to sign in" onPress={() => switchMode('signIn')} />
            </View>
          </View>
        ) : (
          <View className="gap-4">
            {mode === 'signUp' && (
              <Field label="Name" value={name} onChangeText={setName} placeholder="Your name" autoComplete="name" textContentType="name" />
            )}
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            {mode !== 'reset' && (
              <View>
                <Field
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 8 characters"
                  secureTextEntry={!showPassword}
                  autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
                  textContentType={mode === 'signUp' ? 'newPassword' : 'password'}
                  onSubmitEditing={submit}
                />
                <Pressable
                  onPress={() => setShowPassword((s) => !s)}
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute bottom-0 right-1 h-14 w-12 items-center justify-center">
                  <Icon
                    name={showPassword ? { ios: 'eye.slash', android: 'visibility_off' } : { ios: 'eye', android: 'visibility' }}
                    size={18}
                    color={C.muted}
                  />
                </Pressable>
              </View>
            )}

            {mode === 'signIn' && (
              <Pressable onPress={() => switchMode('reset')} className="self-end py-1">
                <Text className="text-sm font-medium text-accent">Forgot password?</Text>
              </Pressable>
            )}

            {!!error && (
              <View className="flex-row items-center gap-2 rounded-2xl bg-danger/10 px-4 py-3">
                <Icon name={{ ios: 'exclamationmark.circle', android: 'error' }} size={16} color={C.danger} />
                <Text className="flex-1 text-sm text-danger">{error}</Text>
              </View>
            )}

            <View className="mt-2">
              <Button title={copy.cta} arrow loading={loading} onPress={submit} />
            </View>
          </View>
        )}

        <View className="flex-1" />
        {mode !== 'reset' && (
          <Pressable onPress={() => switchMode(mode === 'signIn' ? 'signUp' : 'signIn')} className="mt-8 items-center py-2">
            <Text className="text-sm text-muted">
              {mode === 'signIn' ? "Don't have an account? " : 'Already have an account? '}
              <Text className="font-semibold text-accent">{mode === 'signIn' ? 'Sign up' : 'Sign in'}</Text>
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
