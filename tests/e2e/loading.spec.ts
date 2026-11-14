import { test, expect } from '@playwright/test';
import { mockSupabase, signIn } from './helpers/supabase';

for (const device of [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 1000 },
]) {
  test(`${device.name}: skeleton covers startup and slow menu requests without layout errors`, async ({
    context,
    page,
  }) => {
    await page.setViewportSize(device);
    await mockSupabase(context);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    let releaseFonts!: () => void;
    const fonts = new Promise<void>((resolve) => (releaseFonts = resolve));
    await page.route('**/*.ttf', async (route) => {
      await fonts;
      await route.continue();
    });
    const skeleton = page.getByTestId('loading-skeleton');
    try {
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await expect(skeleton).toBeVisible();
      await expect(skeleton).toHaveAttribute('aria-busy', 'true');
      await expect(page.getByRole('progressbar')).toHaveCount(1);
      await expect(page.getByText('Getting things ready…')).toHaveCount(0);
      await expect
        .poll(() =>
          page
            .getByTestId('skeleton-animation')
            .evaluate((el) => Number(getComputedStyle(el).opacity)),
        )
        .toBeLessThan(0.9);
      // Playwright screenshots wait for fonts, so capture the same skeleton below
      // while a data request is pending and the font requests have completed.
    } finally {
      releaseFonts();
    }
    await expect(page.getByText('Welcome back.', { exact: true })).toBeVisible();
    await expect(skeleton).toHaveCount(0);
    await signIn(page, 'student');

    let releaseMenu!: () => void;
    const menu = new Promise<void>((resolve) => (releaseMenu = resolve));
    await context.route('https://canteen.test/rest/v1/daily_menus**', async (route) => {
      await menu;
      await route.fallback();
    });
    try {
      await page.reload();
      await expect(page.getByRole('progressbar', { name: 'Loading the menu' })).toBeVisible();
      await expect(
        page.getByTestId(device.width >= 768 ? 'navigation-sidebar' : 'bottom-navigation'),
      ).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
        .toBeLessThanOrEqual(1);
      for (const card of await page.getByTestId('skeleton-card').all()) {
        const box = await card.boundingBox();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(device.width + 1);
        expect(box!.height).toBeGreaterThan(box!.width / 1.45 + 90);
      }
      await page.screenshot({ path: `test-results/loading-${device.name}-menu.png` });
    } finally {
      releaseMenu();
    }
    await expect(page.getByText('What are you craving today?', { exact: true })).toBeVisible();
    await expect(skeleton).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test('skeleton respects reduced motion and reacts when the preference changes', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  let releaseFonts!: () => void;
  const fonts = new Promise<void>((resolve) => (releaseFonts = resolve));
  await page.route('**/*.ttf', async (route) => {
    await fonts;
    await route.continue();
  });
  try {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    const animation = page.getByTestId('skeleton-animation');
    const opacity = () => animation.evaluate((el) => Number(getComputedStyle(el).opacity));
    await expect(animation).toBeVisible();
    await expect.poll(opacity).toBe(1);
    // Leave enough time for an unwanted pulse to become visible.
    await page.waitForTimeout(600);
    expect(await opacity()).toBe(1);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect.poll(opacity).toBeLessThan(0.9);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect.poll(opacity).toBe(1);
    await page.waitForTimeout(600);
    expect(await opacity()).toBe(1);
  } finally {
    releaseFonts();
  }
  await expect(page.getByText('Welcome back.', { exact: true })).toBeVisible();
});
