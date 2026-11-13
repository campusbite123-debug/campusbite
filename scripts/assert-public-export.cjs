const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(process.argv[2] || 'dist');
const forbidden = [
  'sb_publishable_canteen_e2e',
  'https://canteen.test',
  'Staff-test-password-123!',
  'Student-test-password-123!',
  'demo-admin',
];
function inspect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) inspect(file);
    else if (entry.name.endsWith('.js')) {
      const contents = fs.readFileSync(file, 'utf8');
      if (forbidden.some((value) => contents.includes(value)))
        throw new Error(
          'Test account data was detected in the application export. Rebuild with the normal environment.',
        );
    }
  }
}
try {
  inspect(root);
  console.log('Application export contains no test account credentials or test endpoints.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
