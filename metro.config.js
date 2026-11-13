const { getDefaultConfig } = require('expo/metro-config');
const { createHash } = require('node:crypto');
const { checkPublicEnvironment } = require('./scripts/check-public-env.cjs');
checkPublicEnvironment(__dirname);
const config = getDefaultConfig(__dirname);
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
