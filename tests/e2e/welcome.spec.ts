import { test, expect } from '@playwright/test';
import { FIXED_TIME, mockSupabase, signIn } from './helpers/supabase';

test.beforeEach(async ({ context, page }) => {
  await mockSupabase(context);
  await page.clock.install({ time: new Date(FIXED_TIME) });
});

test('welcome fits phones, tablets and desktop and both account actions work', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  // Direct entry must still have a useful destination without prior app history.
  await page.goto('/login');
  await page.getByRole('button', { name: 'Back to welcome', exact: true }).click();
  await expect(page.getByTestId('welcome-screen')).toBeVisible();
  for (const device of [
    { name: 'small-phone', width: 320, height: 640 },
    { name: 'phone', width: 390, height: 844 },
    { name: 'wide-phone', width: 425, height: 869 },
    { name: 'tablet-portrait', width: 768, height: 1024 },
    { name: 'tablet-landscape', width: 1024, height: 768 },
    { name: 'desktop', width: 1440, height: 1000 },
  ]) {
    await page.setViewportSize(device);
    await page.goto('/');
    await expect(page.getByTestId('welcome-screen')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Good food/ })).toBeVisible();
    await expect(page.getByRole('textbox')).toHaveCount(0);
    await expect
      .poll(() =>
        page.getByTestId('welcome-food-image').evaluate((element) => {
          const photo =
            element instanceof HTMLImageElement ? element : element.querySelector('img');
          return Boolean(photo?.complete && photo.naturalWidth > 0);
        }),
      )
      .toBe(true);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(1);
    for (const name of ['Sign in', 'Create an account']) {
      const button = page.getByRole('button', { name, exact: true });
      await expect(button).toBeVisible();
      const box = (await button.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(device.width);
      expect(box.y + box.height).toBeLessThanOrEqual(device.height);
    }
    await page.screenshot({ path: `test-results/welcome-${device.name}.png` });
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText('Welcome back.', { exact: true })).toBeVisible();
    await page.screenshot({ path: `test-results/back-${device.name}-login.png` });
    await page.getByRole('button', { name: 'Back to welcome', exact: true }).click();
    await expect(page.getByTestId('welcome-screen')).toBeVisible();
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByText('Welcome back.', { exact: true })).toBeVisible();
    await page.goBack();
    await expect(page.getByTestId('welcome-screen')).toBeVisible();
    await page.getByRole('button', { name: 'Create an account', exact: true }).click();
    await expect(page).toHaveURL(/\/register/);
    await expect(page.getByText('Join the table.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Return to sign in', exact: true }).click();
    await expect(page.getByText('Welcome back.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Forgot password?', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Send recovery link', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Return to sign in', exact: true }).click();
    await expect(page.getByText('Welcome back.', { exact: true })).toBeVisible();
  }
  expect(errors).toEqual([]);
});

for (const role of ['student', 'admin'] as const) {
  test(`saved ${role} sessions skip the welcome and reopen their workspace`, async ({ page }) => {
    await signIn(page, role);
    await page.goto('/');
    await expect(page).toHaveURL(role === 'admin' ? /\/admin$/ : /\/home$/);
    await expect(page.getByTestId('welcome-screen')).toHaveCount(0);
    await expect(
      page.getByText(role === 'admin' ? 'A good day starts here.' : 'What are you craving today?', {
        exact: true,
      }),
    ).toBeVisible();
  });
}
