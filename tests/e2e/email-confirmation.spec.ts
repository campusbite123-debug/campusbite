import { test, expect } from '@playwright/test';
import { FIXED_TIME, mockSupabase } from './helpers/supabase';

const tokenHash = 'signup-email-token-for-browser-tests';
const verification = 'https://canteen.test/auth/v1/verify';
const confirmationUrl = `/auth/confirm?token_hash=${tokenHash}&type=email`;
const confirmedUser = {
  id: '40000000-0000-4000-8000-000000000099',
  email: 'new-student@school.test',
  email_confirmed_at: FIXED_TIME,
  aud: 'authenticated',
  role: 'authenticated',
  created_at: FIXED_TIME,
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { full_name: 'New Student' },
  identities: [],
};

test.beforeEach(async ({ context }) => {
  await mockSupabase(context);
});

for (const device of [
  { name: 'phone', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 1000 },
]) {
  test(`${device.name}: email opened in a fresh browser verifies before showing confirmation`, async ({
    page,
  }) => {
    await page.setViewportSize(device);
    let finishVerification!: () => void;
    const ready = new Promise<void>((resolve) => {
      finishVerification = resolve;
    });
    let verificationCount = 0;
    await page.route(verification, async (route) => {
      if (route.request().method() === 'OPTIONS') return route.fallback();
      verificationCount++;
      expect(route.request().postDataJSON()).toMatchObject({
        token_hash: tokenHash,
        type: 'email',
      });
      await ready;
      await route.fulfill({
        json: {
          access_token: 'confirmation-only-access-token',
          refresh_token: 'confirmation-only-refresh-token',
          expires_in: 3600,
          token_type: 'bearer',
          user: confirmedUser,
        },
        headers: { 'access-control-allow-origin': '*' },
      });
    });
    await page.goto(confirmationUrl);
    await expect(page.getByRole('heading', { name: 'Confirming your email…' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your account is confirmed.' })).toHaveCount(0);
    finishVerification();
    await expect(page.getByRole('heading', { name: 'Your account is confirmed.' })).toBeVisible();
    await expect(page.getByText(/You can now use your Campusbite account/)).toBeVisible();
    expect(verificationCount).toBe(1);
    const storage = await page.evaluate(() => JSON.stringify({ ...localStorage }));
    expect(storage).not.toContain('confirmation-only-access-token');
    expect(storage).not.toContain('confirmation-only-refresh-token');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: `test-results/email-confirmed-${device.name}.png`,
      fullPage: true,
    });
    await page.getByRole('button', { name: /Continue to sign in/ }).click();
    await expect(page.getByText('Welcome back.', { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
}

test('expired or used email links explain the next step without claiming success', async ({
  page,
}) => {
  await page.route(verification, async (route) => {
    if (route.request().method() === 'OPTIONS') return route.fallback();
    await route.fulfill({
      status: 403,
      json: { code: 'otp_expired', msg: 'Email link is invalid or has expired' },
      headers: {
        'access-control-allow-origin': '*',
        'access-control-expose-headers': 'X-Supabase-Api-Version',
        'x-supabase-api-version': '2024-01-01',
      },
    });
  });
  await page.goto(confirmationUrl);
  await expect(page.getByText(/This link has expired or has already been used/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your account is confirmed.' })).toHaveCount(0);
  await page
    .getByRole('button', { name: /Back to sign in/ })
    .last()
    .click();
  await expect(page.getByText('Welcome back.', { exact: true })).toBeVisible();
});

test('a direct visit or a password-recovery token cannot claim signup confirmation', async ({
  page,
}) => {
  let verificationCount = 0;
  await page.route(verification, async (route) => {
    verificationCount++;
    await route.abort();
  });
  for (const url of [
    '/auth/confirm?success=true',
    `/auth/confirm?token_hash=${tokenHash}&type=recovery`,
  ]) {
    await page.goto(url);
    await expect(
      page.getByText(/Open the confirmation link in your Campusbite signup email/),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your account is confirmed.' })).toHaveCount(0);
  }
  expect(verificationCount).toBe(0);
});

test('an unconfirmed server response never displays a successful confirmation', async ({
  page,
}) => {
  await page.route(verification, async (route) => {
    if (route.request().method() === 'OPTIONS') return route.fallback();
    await route.fulfill({
      json: { user: { ...confirmedUser, email_confirmed_at: null } },
      headers: { 'access-control-allow-origin': '*' },
    });
  });
  await page.goto(confirmationUrl);
  await expect(page.getByText(/Your email has not been confirmed/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your account is confirmed.' })).toHaveCount(0);
});
