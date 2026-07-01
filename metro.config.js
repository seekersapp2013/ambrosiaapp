const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('mjs');

// Fix: Metro SHA-1 error on EAS build servers when expo has nested node_modules
// (e.g. expo/node_modules/@expo/cli/build/metro-require/require.js).
// Add expo's nested node_modules to watchFolders so Metro can hash those files.
const extraWatchFolders = [];

const expoNestedModules = path.resolve(__dirname, 'node_modules/expo/node_modules');
if (fs.existsSync(expoNestedModules)) {
  extraWatchFolders.push(expoNestedModules);
}

config.watchFolders = [
  ...(config.watchFolders || []),
  ...extraWatchFolders,
];

// Stub out LiveKit native packages on web.
// @livekit/react-native and @livekit/react-native-webrtc rely on
// requireNativeComponent which doesn't exist in a browser environment.
// Metro resolves these to an empty stub when the platform is web so the
// bundle succeeds; the real packages are used on iOS/Android as normal.
const livekitNativeStub = path.resolve(__dirname, 'stubs/livekit-native-stub.js');

const originalResolver = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    platform === 'web' &&
    (moduleName === '@livekit/react-native' ||
      moduleName === '@livekit/react-native-webrtc' ||
      moduleName.startsWith('@livekit/react-native/') ||
      moduleName.startsWith('@livekit/react-native-webrtc/'))
  ) {
    return { filePath: livekitNativeStub, type: 'sourceFile' };
  }

  // Fall through to the default resolver (or any previously set one)
  if (originalResolver) {
    return originalResolver(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
