const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('mjs');

// Windows optimization: Reduce file watching overhead
config.watchFolders = [path.resolve(__dirname)];

// Ignore nested node_modules to reduce watcher load
config.resolver.blockList = [
    /node_modules\/.*\/node_modules\/.*/,
];

module.exports = config;
