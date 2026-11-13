const fs = require('node:fs');
const path = require('node:path');
function isServerCredential(value) {
  value = String(value).trim();
  if (value.startsWith('sb_secret_')) return true;
  try {
    return (
      JSON.parse(Buffer.from(value.split('.')[1], 'base64url').toString()).role === 'service_role'
    );
  } catch {
    return false;
  }
}
function checkPublicEnvironment(root = process.cwd(), environment = process.env) {
  const entries = Object.entries(environment);
  for (const name of [
    '.env',
    '.env.local',
    '.env.development',
    '.env.development.local',
    '.env.production',
    '.env.production.local',
  ]) {
    const file = path.join(root, name);
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    for (const match of content.matchAll(
      /^\s*(?:export\s+)?(EXPO_PUBLIC_[A-Z0-9_]+)\s*=\s*['"]?([^\r\n'"]*)/gm,
    ))
      entries.push([match[1], match[2].trim()]);
  }
  for (const [name, value] of entries)
    if (name.startsWith('EXPO_PUBLIC_') && isServerCredential(String(value)))
      throw new Error(
        `Server credential found in public variable ${name}. Move it to the ignored .env.admin.local file before starting or exporting the app.`,
      );
}
if (require.main === module) {
  try {
    checkPublicEnvironment();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = { isServerCredential, checkPublicEnvironment };
