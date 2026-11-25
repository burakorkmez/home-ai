const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');

const config = withNativewind(getDefaultConfig(__dirname));

// ponytail: react-native-css 3.1.0-rc.1 swaps `react-native` for a shim whose export list lacks
// AssetRegistry (new in RN 0.88), which breaks expo-asset (Asset.fromModule). Let expo-asset import
// the real react-native. Delete once react-native-css ships a fix.
const resolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) =>
  moduleName === 'react-native' && /[\\/]node_modules[\\/]expo-asset[\\/]/.test(context.originModulePath)
    ? context.resolveRequest(context, moduleName, platform)
    : resolveRequest(context, moduleName, platform);

module.exports = config;
