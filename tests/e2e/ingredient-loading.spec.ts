import { expect, test, type Locator } from '@playwright/test';
import { FIXED_TIME, mockSupabase, signIn } from './helpers/supabase';

async function opacity(locator: Locator) {
  return locator.evaluate((element) => Number(getComputedStyle(element).opacity));
}

test.beforeEach(async ({ context, page }) => {
  await mockSupabase(context);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install({ time: new Date(FIXED_TIME) });
});

test('tea waits for its last image and then plays the complete animation', async ({ page }) => {
  let releaseIce!: () => void;
  let iceRequested!: () => void;
  const pendingIce = new Promise<void>((resolve) => (releaseIce = resolve));
  const requestedIce = new Promise<void>((resolve) => (iceRequested = resolve));
  await page.route(/\/tea-ice[^/]*\.webp(?:\?.*)?$/, async (route) => {
    iceRequested();
    await pendingIce;
    await route.continue();
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await signIn(page, 'student');
    await page.getByRole('button', { name: 'View House Iced Tea', exact: true }).click();
    await page.getByRole('button', { name: 'See ingredients', exact: true }).click();
    await requestedIce;
    await expect(page.getByTestId('ingredient-loading')).toBeVisible();
    await expect(page.getByText('Loading ingredients…', { exact: true })).toBeVisible();
    await expect(page.getByTestId('ingredient-stage')).toHaveCount(0);
    await page.clock.runFor(4500);
    await expect(page.getByTestId('ingredient-loading')).toBeVisible();
    await expect(page.getByTestId('ingredient-stage')).toHaveCount(0);
    await page.screenshot({ path: 'test-results/ingredients-loading-tea.png' });

    releaseIce();
    await expect(page.getByTestId('ingredient-stage')).toBeVisible();
    await expect(page.getByTestId('ingredient-loading')).toHaveCount(0);
    expect(await opacity(page.getByTestId('tea-jet'))).toBe(0);
    await page.clock.runFor(1300);
    expect(await opacity(page.getByTestId('tea-jet'))).toBeGreaterThan(0);
    await page.clock.runFor(3200);
    expect(await opacity(page.getByTestId('tea-jet'))).toBe(0);
    await expect(page.getByTestId('ingredient-callout-0')).toHaveText('Brewed tea');
    await expect(page.getByTestId('ingredient-callout-2')).toHaveText('Ice');
    expect(errors).toEqual([]);
  } finally {
    releaseIce();
  }
});

test('burger waits for every layer and Back to meal remains usable while loading', async ({
  page,
}) => {
  let releasePatty!: () => void;
  let pattyRequested!: () => void;
  const pendingPatty = new Promise<void>((resolve) => (releasePatty = resolve));
  const requestedPatty = new Promise<void>((resolve) => (pattyRequested = resolve));
  await page.route(/\/patty-floating[^/]*\.webp(?:\?.*)?$/, async (route) => {
    pattyRequested();
    await pendingPatty;
    await route.continue();
  });
  try {
    await signIn(page, 'student');
    await page.getByRole('button', { name: 'View Classic Campus Burger', exact: true }).click();
    const anotherLayerLoaded = page.waitForResponse(/\/bun-top-floating[^/]*\.webp(?:\?.*)?$/);
    await page.getByRole('button', { name: 'See ingredients', exact: true }).click();
    await requestedPatty;
    expect((await anotherLayerLoaded).ok()).toBe(true);
    await page.clock.runFor(3000);
    await expect(page.getByTestId('ingredient-loading')).toBeVisible();
    await expect(page.getByTestId('ingredient-stage')).toHaveCount(0);
    await page.getByRole('button', { name: 'Back to meal', exact: true }).click();
    await expect(page.getByRole('button', { name: 'See ingredients', exact: true })).toBeVisible();
    await expect(page.getByTestId('ingredient-loading')).toHaveCount(0);

    releasePatty();
    await page.getByRole('button', { name: 'See ingredients', exact: true }).click();
    await expect(page.getByTestId('ingredient-stage')).toBeVisible();
    await expect(page.getByTestId('ingredient-layer-4')).toBeVisible();
    await page.clock.runFor(2300);
    await expect(page.getByTestId('ingredient-callout-4')).toHaveText('Beef patty');
  } finally {
    releasePatty();
  }
});

test('failed ingredient images show a retry and recover into the scene', async ({ page }) => {
  let failIce = true;
  await page.route(/\/tea-ice[^/]*\.webp(?:\?.*)?$/, async (route) => {
    if (failIce)
      return route.fulfill({ status: 503, contentType: 'text/plain', body: 'Unavailable' });
    await route.continue();
  });
  await signIn(page, 'student');
  await page.getByRole('button', { name: 'View House Iced Tea', exact: true }).click();
  await page.getByRole('button', { name: 'See ingredients', exact: true }).click();
  await expect(page.getByTestId('ingredient-image-error')).toBeVisible();
  await expect(
    page.getByText('The ingredient images couldn’t load.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId('ingredient-stage')).toHaveCount(0);
  await expect(page.getByTestId('ingredient-loading')).toHaveCount(0);
  failIce = false;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByTestId('ingredient-stage')).toBeVisible();
  await expect(page.getByTestId('ingredient-image-error')).toHaveCount(0);
  expect(await opacity(page.getByTestId('tea-jet'))).toBe(0);
  await page.clock.runFor(1300);
  expect(await opacity(page.getByTestId('tea-jet'))).toBeGreaterThan(0);
});
