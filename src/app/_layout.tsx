import '@/global.css';

import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { authClient } from '@/lib/auth-client';
import { C } from '@/lib/theme';

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, primary: C.accent, background: C.bg, card: C.surface, text: C.cream, border: C.line },
};

export default function RootLayout() {
  const { data: session } = authClient.useSession();

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.bg }}>
      <ThemeProvider value={theme}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
          <Stack.Protected guard={!!session} redirectTo="/welcome">
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="generating" options={{ animation: 'fade', gestureEnabled: false }} />
            <Stack.Screen name="design/[id]" />
          </Stack.Protected>
          <Stack.Protected guard={!session} redirectTo="/">
            <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
            <Stack.Screen name="sign-in" />
          </Stack.Protected>
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
