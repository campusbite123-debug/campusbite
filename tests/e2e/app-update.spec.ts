import { expect, test } from '@playwright/test';
import { FIXED_TIME, mockSupabase } from './helpers/supabase';
import currentRelease from '../../public/app-releases.json';

test('a release reminder survives reload and a newer web release can be accepted', async ({
  page,
  context,
}) => {
  await mockSupabase(context);
  await page.clock.install({ time: new Date(FIXED_TIME) });
  let version = '1000.0.0';
  await page.route('**/app-releases.json', (route) =>
    route.fulfill({ json: { web: { version } } }),
  );
  await page.goto('/login');
  const later = page.getByRole('button', { name: 'Remind me tomorrow' });
  await expect(later).toBeVisible();
  await later.click();
  await expect(later).toBeHidden();
  await Promise.all([page.waitForResponse('**/app-releases.json'), page.reload()]);
  await expect(page.getByText('Welcome back.', { exact: true })).toBeVisible();
  await expect(later).toBeHidden();

  await page.clock.fastForward(25 * 60 * 60 * 1000);
  await expect(later).toBeVisible();
  await later.click();
  version = '1000.0.1';
  await page.reload();
  await expect(page.getByText(/Version 1000\.0\.1 is ready/)).toBeVisible();
  // After updating, the loaded bundle and the published version match again.
  version = currentRelease.web.version;
  await Promise.all([
    page.waitForResponse('**/app-releases.json'),
    page.getByRole('button', { name: 'Update now' }).click(),
  ]);
  await expect(page).toHaveURL(/\/login$/);
  await expect(later).toBeHidden();
});
