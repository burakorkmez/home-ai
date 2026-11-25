import { expoClient } from '@better-auth/expo/client';
import { createAuthClient } from 'better-auth/react';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { NativeModules, Platform } from 'react-native';

// Store builds: EXPO_PUBLIC_API_URL (see eas.json) is the EAS Hosting URL.
// Dev: the API routes are served by the same Metro server the JS bundle came from (localhost on a
// simulator, the Mac's LAN IP on a phone). Constants.expoConfig.hostUri is undefined in dev builds.
// Web: the page's own origin; during server rendering there is no window, so '' (relative URLs).
// iOS simulator: force localhost even if the dev client loaded via LAN IP. Google's redirect URI is
// BETTER_AUTH_URL (localhost), and the OAuth state cookie must be set on that same host or the
// callback fails with state_mismatch.
const devServerOrigin = () =>
  Platform.OS !== 'web'
    ? Platform.OS === 'ios' && !Device.isDevice
      ? `http://localhost:${new URL(NativeModules.SourceCode.getConstants().scriptURL).port}`
      : new URL(NativeModules.SourceCode.getConstants().scriptURL).origin
    : typeof window !== 'undefined'
      ? window.location.origin
      : '';
export const API_URL = process.env.EXPO_PUBLIC_API_URL || devServerOrigin();

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [expoClient({ scheme: 'homeai', storagePrefix: 'homeai', storage: SecureStore })],
});
