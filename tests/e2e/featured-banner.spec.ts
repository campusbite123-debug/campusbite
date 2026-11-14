import { test, expect } from '@playwright/test';
import { FIXED_TIME, mockSupabase, signIn } from './helpers/supabase';

test.beforeEach(async ({ context, page }) => {
  await mockSupabase(context);
  await page.clock.install({ time: new Date(FIXED_TIME) });
});

test('featured banner loops automatically and continues after manual selection without playback controls', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await signIn(page, 'student');
  const banner = page.getByTestId('featured-banner');
  const feature = (number: number) =>
    banner.getByRole('button', { name: new RegExp(`^Show feature ${number}:`) });
  await expect(banner.getByTestId('banner-position')).toHaveCount(0);
  await expect(banner.getByRole('button', { name: /^(Pause|Play) banner$/ })).toHaveCount(0);
  await expect(feature(1)).toHaveAttribute('aria-pressed', 'true');
  await page.clock.runFor(100);
  const initialHeight = (await banner.boundingBox())!.height;
  await page.clock.fastForward(6600);
  await page.clock.runFor(500);
  await expect(feature(2)).toHaveAttribute('aria-pressed', 'true');
  await expect(banner.getByTestId('banner-title')).toHaveText('Good food.');
  await expect(
    banner.getByRole('img', { name: 'Featured Pork Sisig with Rice', exact: true }),
  ).toBeVisible();

  await banner.getByRole('button', { name: /^Show feature 4:/ }).click();
  await page.clock.runFor(500);
  await expect(feature(4)).toHaveAttribute('aria-pressed', 'true');
  await expect(banner.getByTestId('banner-title')).toHaveText('Pick a favorite.');
  await expect(banner.getByRole('button', { name: /^Show feature 4:/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect((await banner.boundingBox())!.height).toBe(initialHeight);
  await expect(banner.getByTestId('banner-slide')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: 'test-results/featured-banner-phone-fourth.png' });

  // Selecting a dot must keep automatic rotation running through repeated wraps.
  for (const next of [1, 2]) {
    await page.clock.fastForward(6600);
    await page.clock.runFor(500);
    await expect(feature(next)).toHaveAttribute('aria-pressed', 'true');
  }

  // Rapid selection must finish on the last requested slide, with visible content.
  await banner.getByRole('button', { name: /^Show feature 2:/ }).click();
  await banner.getByRole('button', { name: /^Show feature 3:/ }).click();
  await banner.getByRole('button', { name: /^Show feature 1:/ }).click();
  await page.clock.runFor(500);
  await expect(feature(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(banner.getByTestId('banner-slide')).toHaveCSS('opacity', '1');
  await banner.getByRole('button', { name: /^Show feature 4:/ }).click();
  await page.clock.runFor(500);
  await expect(feature(4)).toHaveAttribute('aria-pressed', 'true');
  await page.clock.fastForward(6600);
  await page.clock.runFor(500);
  await expect(feature(1)).toHaveAttribute('aria-pressed', 'true');
  await banner.getByRole('button', { name: 'Explore the menu', exact: true }).click();
  await expect(page.getByText('The campus menu', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('reduced motion keeps the banner still and permits manual selection', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await signIn(page, 'student');
  const banner = page.getByTestId('featured-banner');
  const first = banner.getByRole('button', { name: /^Show feature 1:/ });
  await expect(first).toHaveAttribute('aria-pressed', 'true');
  await expect(banner.getByRole('button', { name: 'Pause banner', exact: true })).toHaveCount(0);
  await page.clock.fastForward(21000);
  await expect(first).toHaveAttribute('aria-pressed', 'true');
  await banner.getByRole('button', { name: /^Show feature 3:/ }).click();
  await expect(banner.getByRole('button', { name: /^Show feature 3:/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(banner.getByTestId('banner-slide')).toHaveCSS('opacity', '1');
  await expect(
    banner.getByRole('img', { name: 'Featured Fried Chicken with Rice', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: 'test-results/featured-banner-tablet-third.png' });
});
