import { test, expect, type BrowserContext } from '@playwright/test';
import { clickSignOut, fillLogin, FIXED_TIME, mockSupabase, signIn } from './helpers/supabase';

async function holdRequests(context: BrowserContext, pattern: string) {
  let release!: () => void;
  let started!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  const requested = new Promise<void>((resolve) => (started = resolve));
  await context.route(pattern, async (route) => {
    if (route.request().method() !== 'OPTIONS') {
      started();
      await gate;
    }
    await route.fallback();
  });
  return { release, requested };
}

test.beforeEach(async ({ context, page }) => {
  await mockSupabase(context);
  await page.clock.install({ time: new Date(FIXED_TIME) });
});

for (const role of ['student', 'admin'] as const) {
  for (const device of [
    { name: 'phone', width: 390, height: 844 },
    { name: 'desktop', width: 1440, height: 1000 },
  ]) {
    test(`${device.name}: ${role} sees loading through login, profile lookup and logout`, async ({
      context,
      page,
    }) => {
      await page.setViewportSize(device);
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await fillLogin(page, role);
      const token = await holdRequests(context, 'https://canteen.test/auth/v1/token**');
      const profile = await holdRequests(context, 'https://canteen.test/rest/v1/profiles**');
      const logout = await holdRequests(context, 'https://canteen.test/auth/v1/logout**');
      const overlay = page.getByTestId('auth-loading');
      try {
        await page.getByRole('button', { name: /^Sign in/ }).click();
        await token.requested;
        await expect(page.getByRole('progressbar', { name: 'Signing you in…' })).toBeVisible();
        await expect(overlay).toHaveAttribute('aria-busy', 'true');
        const box = (await overlay.boundingBox())!;
        expect(box.x).toBe(0);
        expect(box.y).toBe(0);
        expect(box.width).toBe(device.width);
        expect(box.height).toBe(device.height);
        await page.screenshot({
          path: `test-results/auth-loading-${role}-${device.name}-login.png`,
        });
        token.release();
        await profile.requested;
        await expect(page.getByRole('progressbar', { name: 'Signing you in…' })).toBeVisible();
        profile.release();
        await expect(
          page.getByText(
            role === 'admin' ? 'A good day starts here.' : 'What are you craving today?',
            {
              exact: true,
            },
          ),
        ).toBeVisible();
        await expect(overlay).toHaveCount(0);
        await clickSignOut(page);
        await logout.requested;
        await expect(page.getByRole('progressbar', { name: 'Signing you out…' })).toBeVisible();
        await page.screenshot({
          path: `test-results/auth-loading-${role}-${device.name}-logout.png`,
        });
        logout.release();
        await expect(page.getByText('Welcome back.', { exact: true })).toBeVisible();
        await expect(overlay).toHaveCount(0);
        await expect(page).toHaveURL(/\/login/);
        expect(errors).toEqual([]);
      } finally {
        token.release();
        profile.release();
        logout.release();
      }
    });
  }
}

test('failed login clears loading and keeps the form usable', async ({ context, page }) => {
  await fillLogin(page, 'student');
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('wrong-password');
  const token = await holdRequests(context, 'https://canteen.test/auth/v1/token**');
  try {
    await page.getByRole('button', { name: /^Sign in/ }).click();
    await token.requested;
    await expect(page.getByRole('progressbar', { name: 'Signing you in…' })).toBeVisible();
  } finally {
    token.release();
  }
  await expect(page.getByText('Invalid login credentials', { exact: true })).toBeVisible();
  await expect(page.getByTestId('auth-loading')).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Campus email', exact: true })).toHaveValue(
    'student@school.test',
  );
  await expect(page.getByRole('button', { name: /^Sign in/ })).toBeEnabled();
});

test('failed logout clears loading, preserves the workspace and allows a retry', async ({
  context,
  page,
}) => {
  await signIn(page, 'student');
  let fail = true;
  await context.route('https://canteen.test/auth/v1/logout**', async (route) => {
    if (route.request().method() === 'OPTIONS' || !fail) return route.fallback();
    await route.fulfill({
      status: 500,
      headers: { 'access-control-allow-origin': '*' },
      json: { message: 'Could not sign out. Please try again.' },
    });
  });
  const logout = await holdRequests(context, 'https://canteen.test/auth/v1/logout**');
  try {
    await clickSignOut(page);
    await logout.requested;
    await expect(page.getByRole('progressbar', { name: 'Signing you out…' })).toBeVisible();
  } finally {
    logout.release();
  }
  await expect(
    page.getByText('Could not sign out. Please try again.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId('auth-loading')).toHaveCount(0);
  await expect(page.getByText('What are you craving today?', { exact: true })).toBeVisible();
  fail = false;
  await clickSignOut(page);
  await expect(page.getByText('Welcome back.', { exact: true })).toBeVisible();
  await expect(page.getByTestId('auth-loading')).toHaveCount(0);
});
