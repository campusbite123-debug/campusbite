const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const env = {
  ...process.env,
  EXPO_PUBLIC_SUPABASE_URL: 'https://canteen.test',
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_canteen_e2e',
  E2E_BASE_URL: 'http://localhost:8082',
  PORT: '8082',
  PREVIEW_DIR: 'dist-e2e',
  CAMPUSBITE_E2E_BUILD: 'true',
};
// Credentials here are public, fake values. Test HTTP responses are intercepted in Playwright.
const exported = spawnSync(
  process.execPath,
  [
    path.join(root, 'node_modules/expo/bin/cli'),
    'export',
    '--platform',
    'web',
    '--output-dir',
    'dist-e2e',
  ],
  { cwd: root, env, stdio: 'inherit' },
);
if (exported.status !== 0) process.exit(exported.status || 1);
const preview = spawn(process.execPath, ['scripts/preview.cjs'], {
  cwd: root,
  env,
  stdio: ['ignore', 'pipe', 'inherit'],
});
let started = false;
preview.stdout.on('data', (chunk) => {
  process.stdout.write(chunk);
  if (started || !chunk.toString().includes('production preview')) return;
  started = true;
  const test = spawn(
    process.execPath,
    [path.join(root, 'node_modules/@playwright/test/cli.js'), 'test', ...process.argv.slice(2)],
    { cwd: root, env, stdio: 'inherit' },
  );
  test.on('exit', (code) => {
    preview.kill();
    process.exitCode = code || 0;
  });
});
preview.on('error', () => {
  console.error('Could not start the E2E preview server.');
  process.exitCode = 1;
});
preview.on('exit', (code) => {
  if (!started) {
    console.error('E2E preview did not start. Check that port 8082 is available.');
    process.exitCode = code || 1;
  }
});
process.on('SIGINT', () => {
  preview.kill();
  process.exit(130);
});
