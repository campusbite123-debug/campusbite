import { test, expect } from '@playwright/test';
import { FIXED_TIME, mockSupabase, signIn } from './helpers/supabase';

test.beforeEach(async ({ context, page }) => {
  await mockSupabase(context);
  await page.clock.install({ time: new Date(FIXED_TIME) });
});

for (const width of [390, 1440]) {
  test(`sign in moves the welcome photo into the login panel at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await expect(page.getByTestId('welcome-screen')).toBeVisible();
    const animation = page.evaluate(
      () =>
        new Promise<string[]>((resolve) => {
          const start = document.startViewTransition.bind(document);
          document.startViewTransition = (update) => {
            const transition = start(update);
            void transition.ready.then(
              () =>
                resolve([
                  getComputedStyle(
                    document.documentElement,
                    '::view-transition-group(campusbite-photo)',
                  ).animationName,
                  getComputedStyle(
                    document.documentElement,
                    '::view-transition-new(campusbite-sign-in)',
                  ).animationName,
                ]),
              () => resolve(['skipped']),
            );
            return transition;
          };
        }),
    );
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    expect(await animation).toEqual([
      expect.stringContaining('campusbite-photo'),
      'sign-in-arrive',
    ]);
    await expect(page.getByRole('textbox', { name: 'Campus email' })).toBeEditable();
    await expect(page.locator('html')).not.toHaveAttribute('data-sign-in-transition', /.+/);
    const reverse = page.evaluate(
      () =>
        new Promise<string[]>((resolve) => {
          const start = document.startViewTransition.bind(document);
          document.startViewTransition = (update) => {
            const transition = start(update);
            void transition.ready.then(
              () =>
                resolve([
                  getComputedStyle(
                    document.documentElement,
                    '::view-transition-group(campusbite-photo)',
                  ).animationName,
                  getComputedStyle(
                    document.documentElement,
                    '::view-transition-new(campusbite-welcome-copy)',
                  ).animationName,
                  document.documentElement.dataset.signInDirection ?? '',
                ]),
              () => resolve(['skipped']),
            );
            return transition;
          };
        }),
    );
    await page.getByRole('button', { name: 'Back to welcome', exact: true }).click();
    expect(await reverse).toEqual([
      expect.stringContaining('campusbite-photo'),
      'sign-in-arrive',
      'back',
    ]);
    await expect(page.getByTestId('welcome-screen')).toBeVisible();
    await expect(page.locator('html')).not.toHaveAttribute('data-sign-in-transition', /.+/);
  });
}

for (const width of [390, 1440]) {
  test(`account panels animate in both directions at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/login');
    await expect(page.getByText('Welcome back.', { exact: true })).toBeVisible();
    await page.evaluate(() => {
      const start = document.startViewTransition.bind(document);
      document.startViewTransition = (update) => {
        const transition = start(update);
        void transition.ready.then(() => {
          document.documentElement.dataset.testTransition = JSON.stringify({
            direction: document.documentElement.dataset.signInDirection,
            photo: getComputedStyle(
              document.documentElement,
              '::view-transition-group(campusbite-photo)',
            ).animationName,
            form: getComputedStyle(
              document.documentElement,
              '::view-transition-new(campusbite-sign-in)',
            ).animationName,
          });
        });
        return transition;
      };
    });
    await page.getByRole('button', { name: /New to campusbite/ }).click();
    await expect(page.getByText('Join the table.', { exact: true })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute(
      'data-test-transition',
      /"direction":"register".*"photo":".*campusbite-photo.*"form":"auth-form-in"/,
    );
    await expect(page.locator('html')).not.toHaveAttribute('data-sign-in-transition', /.+/);
    const photo = (await page.locator('[data-testid="auth-food-hero"]:visible').boundingBox())!;
    const form = (await page.locator('#auth-form:visible').boundingBox())!;
    if (width >= 1000) expect(form.x + form.width).toBeLessThanOrEqual(photo.x + 1);
    else expect(form.y).toBeGreaterThanOrEqual(photo.y + photo.height - 1);
    await page.screenshot({ path: `test-results/register-swap-${width}.png` });
    await page.getByRole('button', { name: 'Return to sign in', exact: true }).click();
    await expect(page.getByText('Welcome back.', { exact: true })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute(
      'data-test-transition',
      /"direction":"login".*"form":"auth-form-in"/,
    );
    await expect(page.locator('html')).not.toHaveAttribute('data-sign-in-transition', /.+/);
    if (width >= 1000) {
      const returnedPhoto = (await page
        .locator('[data-testid="auth-food-hero"]:visible')
        .boundingBox())!;
      const returnedForm = (await page.locator('#auth-form:visible').boundingBox())!;
      expect(returnedPhoto.x + returnedPhoto.width).toBeLessThanOrEqual(returnedForm.x + 1);
    }
    await page.getByRole('button', { name: /New to campusbite/ }).click();
    await expect(page.getByText('Join the table.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Back to sign in', exact: true }).click();
    await expect(page.getByText('Welcome back.', { exact: true })).toBeVisible();
  });
}

test('reduced motion opens sign in directly', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.evaluate(() => {
    document.startViewTransition = () => {
      throw new Error('Unexpected motion');
    };
  });
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Campus email' })).toBeEditable();
  await page.getByRole('button', { name: /New to campusbite/ }).click();
  await expect(page.getByText('Join the table.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Return to sign in', exact: true }).click();
  await expect(page.getByText('Welcome back.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Back to welcome', exact: true }).click();
  await expect(page.getByTestId('welcome-screen')).toBeVisible();
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
