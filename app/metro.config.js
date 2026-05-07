// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Some packages (e.g. zustand >= 4.5) ship ESM with `import.meta.env`, which
// Hermes / Metro's web bundle can't parse. Prefer the CJS `main` entry by
// disabling package-exports resolution.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
