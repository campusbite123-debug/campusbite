const { getDefaultConfig } = require('expo/metro-config');
const { createHash } = require('node:crypto');
const { mkdirSync } = require('node:fs');
const path = require('node:path');
const { checkPublicEnvironment } = require('./scripts/check-public-env.cjs');
checkPublicEnvironment(__dirname);
const config = getDefaultConfig(__dirname);
// Keep both Metro caches beside the project, where this checkout has free space.
const cacheRoot = path.join(__dirname, '.tmp', 'metro');
config.fileMapCacheDirectory = path.join(cacheRoot, 'file-map');
mkdirSync(config.fileMapCacheDirectory, { recursive: true });
// Preserve Expo's binary cache format when changing its storage location.
const TransformerCache = config.cacheStores[0].constructor;
config.cacheStores = [new TransformerCache({ root: path.join(cacheRoot, 'transformer') })];
const cachePattern = cacheRoot
  .replace(/\\/g, '/')
  .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  .replace(/\//g, '[\\\\/]');
config.resolver.blockList.push(new RegExp(`^${cachePattern}(?:[\\\\/]|$)`));
// Expo inlines public variables during transformation. Separate their caches so
// a test export can never leave its fake endpoint in the normal application.
const publicSettings = Object.keys(process.env)
  .filter((key) => key.startsWith('EXPO_PUBLIC_'))
  .sort()
  .map((key) => [key, process.env[key]]);
const environmentHash = createHash('sha256')
  .update(JSON.stringify([publicSettings, process.env.CAMPUSBITE_E2E_BUILD || 'application']))
  .digest('hex');
config.cacheVersion = `${config.cacheVersion}-campusbite-${environmentHash}`;
module.exports = config;
