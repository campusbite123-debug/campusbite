// Terminal only. This module is never imported by the Expo app.
import { createInterface } from 'node:readline/promises';
import { createClient } from '@supabase/supabase-js';
import { provisionAdministrator } from './lib/admin-provisioning.mjs';

const help = `Create a Campusbite administrator from this terminal.\n\n  npm run admin:create\n\nConfigure SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)\nin the ignored .env.admin.local file or the current terminal environment.\nThe command asks for staff details and a hidden password; it never prints credentials.\nNo password arguments, default accounts or public role-changing tools are supported.\nApply all database migrations before running this command.\n`;
if (process.argv.includes('--help')) {
  console.log(help);
  process.exit(0);
}
if (process.argv.length > 2) {
  console.error(
    'Use npm run admin:create without arguments. Passwords must be entered at the hidden prompt.',
  );
  process.exit(1);
}

function hiddenPrompt(label) {
  const input = process.stdin;
  if (!input.isTTY || !process.stdout.isTTY)
    throw new Error('An interactive terminal is required for hidden credential entry.');
  process.stdout.write(label);
  return new Promise((resolve, reject) => {
    const wasRaw = input.isRaw;
    let value = '';
    function finish(error) {
      input.removeListener('data', read);
      input.setRawMode(wasRaw);
      input.pause();
      process.stdout.write('\n');
      if (error) reject(error);
      else resolve(value);
    }
    function read(chunk) {
      for (const char of chunk.toString('utf8')) {
        if (char === '\u0003' || char === '\u0004') {
          finish(new Error('Cancelled.'));
          return;
        }
        if (char === '\r' || char === '\n') {
          finish();
          return;
        }
        if (char === '\u007f' || char === '\b') value = Array.from(value).slice(0, -1).join('');
        else if (char === '\u0015') value = '';
        else if (char >= ' ' && char !== '\u001b') value += char;
      }
    }
    input.setRawMode(true);
    input.resume();
    input.on('data', read);
  });
}
let secret = '';
let password = '';
try {
  const url = process.env.SUPABASE_URL?.trim();
  if (
    !url ||
    !(/^https:\/\//.test(url) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(url))
  )
    throw new Error('Set SUPABASE_URL in .env.admin.local or the terminal environment.');
  secret =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    (await hiddenPrompt('Supabase server credential (hidden): '));
  let privileged = secret.startsWith('sb_secret_');
  try {
    privileged ||=
      JSON.parse(Buffer.from(secret.split('.')[1], 'base64url').toString()).role === 'service_role';
  } catch {}
  if (!privileged)
    throw new Error(
      'A server secret or service-role credential is required. A publishable key cannot create administrators.',
    );
  const prompts = createInterface({ input: process.stdin, output: process.stdout });
  let fullName;
  let email;
  let staffId;
  try {
    fullName = await prompts.question('Staff full name: ');
    email = await prompts.question('Staff email: ');
    staffId = await prompts.question('Unique staff ID: ');
  } finally {
    prompts.close();
  }
  password = await hiddenPrompt('New password, at least 12 characters (hidden): ');
  const confirmation = await hiddenPrompt('Confirm password (hidden): ');
  if (password !== confirmation) throw new Error('Passwords do not match. No account was created.');
  const client = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const result = await provisionAdministrator(client, { fullName, email, staffId, password });
  console.log(
    `Administrator created. Account ID: ${result.id}. Sign in through the same application login page used by students.`,
  );
} catch (error) {
  let message = error instanceof Error ? error.message : 'Administrator creation failed.';
  for (const value of [secret, password])
    if (value) message = message.replaceAll(value, '[redacted]');
  console.error(message);
  process.exitCode = 1;
} finally {
  secret = '';
  password = '';
}
