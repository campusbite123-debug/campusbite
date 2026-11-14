import { test, expect, type Page, type Locator } from '@playwright/test';
import { FIXED_TIME, mockSupabase, signIn } from './helpers/supabase';

const devices = [
  { name: 'small-phone', width: 320, height: 640 },
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet-portrait', width: 768, height: 1024 },
  { name: 'tablet-landscape', width: 1024, height: 768 },
  { name: 'desktop', width: 1440, height: 1000 },
];

async function fitsPage(page: Page) {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
    .toBeLessThanOrEqual(1);
  await expect
    .poll(() =>
      page
        .getByTestId('page-scroll')
        .evaluate((element) => element.scrollWidth - element.clientWidth),
    )
    .toBeLessThanOrEqual(1);
}
async function fitsScreen(page: Page, locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
}
async function visuallyReady(locator: Locator) {
  await expect
    .poll(() =>
      locator.evaluate((element) => {
        for (let node: Element | null = element; node; node = node.parentElement)
          if (Number(getComputedStyle(node).opacity) < 0.99) return false;
        return true;
      }),
    )
    .toBe(true);
}

async function fitsNavigation(page: Page, activeName: string) {
  if (page.viewportSize()!.width >= 768) return;
  const bar = page.getByTestId('bottom-navigation');
  const active = page.getByTestId('navigation-active-tab');
  const circle = page.getByTestId('navigation-active-circle');
  await expect(bar.getByRole('tab')).toHaveCount(5);
  await expect(active).toHaveAccessibleName(activeName);
  await expect(bar.getByRole('tab', { selected: true })).toHaveCount(1);
  await expect(active).toHaveAttribute('aria-selected', 'true');
  await expect(circle).toHaveCount(1);
  const barBox = (await bar.boundingBox())!;
  expect(barBox.x).toBeGreaterThan(0);
  expect(barBox.x + barBox.width).toBeLessThan(page.viewportSize()!.width);
  await expect.poll(async () => (await circle.boundingBox())!.y).toBeLessThan(barBox.y - 10);
  await fitsScreen(page, circle);
  const circleBox = (await circle.boundingBox())!;
  expect(circleBox.width).toBeCloseTo(circleBox.height, 1);
  for (const tab of await bar.getByRole('tab').all()) {
    await fitsScreen(page, tab);
    const box = (await tab.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  }
}

test.beforeEach(async ({ context, page }) => {
  await mockSupabase(context);
  await page.clock.install({ time: new Date(FIXED_TIME) });
});

for (const device of devices) {
  test(`${device.name}: student menu, pickup and receipt fit the device`, async ({ page }) => {
    await page.setViewportSize(device);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await signIn(page, 'student');
    await expect(
      page.getByTestId(device.width >= 768 ? 'navigation-sidebar' : 'bottom-navigation'),
    ).toBeVisible();
    await fitsNavigation(page, 'Home');
    await fitsPage(page);
    await page.screenshot({ path: `test-results/responsive-${device.name}-home.png` });
    const banner = page.getByTestId('featured-banner');
    const bannerHeight = (await banner.boundingBox())!.height;
    for (let feature = 1; feature <= 4; feature += 1) {
      await banner.getByRole('button', { name: new RegExp(`^Show feature ${feature}:`) }).click();
      await expect(
        banner.getByRole('button', { name: new RegExp(`^Show feature ${feature}:`) }),
      ).toHaveAttribute('aria-pressed', 'true');
      await visuallyReady(banner.getByTestId('banner-slide'));
      await fitsScreen(page, banner);
      await fitsScreen(page, banner.getByRole('button', { name: 'Explore the menu', exact: true }));
      const body = (await banner.getByTestId('banner-body').boundingBox())!;
      const action = (await banner
        .getByRole('button', { name: 'Explore the menu', exact: true })
        .boundingBox())!;
      expect(body.y + body.height).toBeLessThanOrEqual(action.y);
      expect((await banner.boundingBox())!.height).toBe(bannerHeight);
    }
    const navRole = device.width >= 768 ? 'link' : 'tab';
    await page.getByRole(navRole, { name: 'Menu', exact: true }).click();
    await fitsNavigation(page, 'Menu');
    if (device.width < 768)
      await expect(page.getByRole('tab', { name: 'Menu', exact: true })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    await expect(page.getByText('The campus menu', { exact: true })).toBeVisible();
    await fitsPage(page);
    for (const card of await page.getByTestId('meal-card').all()) {
      await fitsScreen(page, card);
      expect((await card.boundingBox())!.width).toBeGreaterThan(130);
    }
    await page.getByTestId('meal-card').first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/responsive-${device.name}-menu.png` });
    const add = page.getByRole('button', {
      name: 'Add Chicken Adobo with Rice to bag',
      exact: true,
    });
    const addBox = await add.boundingBox();
    expect(addBox!.width).toBeGreaterThanOrEqual(44);
    expect(addBox!.height).toBeGreaterThanOrEqual(44);
    await page.getByRole('button', { name: 'View Chicken Adobo with Rice', exact: true }).click();
    const addInSheet = page.getByRole('button', { name: /Add to bag/ });
    await expect(addInSheet).toBeVisible();
    await visuallyReady(addInSheet);
    await fitsScreen(page, addInSheet);
    expect(
      (await addInSheet.boundingBox())!.y + (await addInSheet.boundingBox())!.height,
    ).toBeLessThanOrEqual(device.height + 1);
    await page.screenshot({ path: `test-results/responsive-${device.name}-meal.png` });
    await addInSheet.click();
    await page.getByRole('button', { name: 'View bag', exact: true }).click();
    await expect(page.getByText('Your bag, your break.', { exact: true })).toBeVisible();
    await fitsNavigation(page, 'Cart');
    await fitsPage(page);
    if (device.width < 600) {
      const checkout = page.getByTestId('checkout-actions');
      await expect(checkout).toBeVisible();
      await expect(page.getByTestId('navigation-cart-count')).toHaveText('1');
      const checkoutBox = (await checkout.boundingBox())!;
      const dockBox = (await page.getByTestId('navigation-dock').boundingBox())!;
      expect(checkoutBox.y + checkoutBox.height).toBeLessThanOrEqual(dockBox.y);
    }
    await page.screenshot({ path: `test-results/responsive-${device.name}-cart.png` });
    await page.getByRole('button', { name: '9:30 AM', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm pre-order', exact: true }).click();
    await expect(page.getByText('Your pre-order is in!', { exact: true })).toBeVisible();
    await visuallyReady(page.getByRole('button', { name: 'Track my order', exact: true }));
    await fitsScreen(page, page.getByRole('button', { name: 'Track my order', exact: true }));
    await page.screenshot({ path: `test-results/responsive-${device.name}-confirmation.png` });
    await page.getByRole('button', { name: 'Track my order', exact: true }).click();
    await expect(page.getByText('Your digital receipt', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
    await page.getByRole(navRole, { name: 'Profile', exact: true }).click();
    await expect(page.getByText('A little about you.', { exact: true })).toBeVisible();
    await fitsNavigation(page, 'Profile');
    await fitsPage(page);
    if (device.width < 768) {
      await page.getByRole('tab', { name: 'Orders', exact: true }).click();
      await expect(page.getByText('Your orders', { exact: true })).toBeVisible();
      await fitsNavigation(page, 'Orders');
      await page.getByRole('tab', { name: 'Cart', exact: true }).click();
      await expect(page.getByText('Your bag, your break.', { exact: true })).toBeVisible();
      await fitsNavigation(page, 'Cart');
      await page.getByRole('tab', { name: 'Home', exact: true }).click();
      await expect(page.getByText('What are you craving today?', { exact: true })).toBeVisible();
      await fitsNavigation(page, 'Home');
    }
    expect(errors).toEqual([]);
  });

  test(`${device.name}: administrator pages and navigation fit the device`, async ({ page }) => {
    await page.setViewportSize(device);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await signIn(page, 'admin');
    await fitsNavigation(page, 'Dashboard');
    await fitsPage(page);
    await page.screenshot({ path: `test-results/responsive-${device.name}-dashboard.png` });
    if (device.width < 768) {
      await page.getByRole('tab', { name: 'Orders', exact: true }).click();
      await expect(page.getByText('The order queue', { exact: true })).toBeVisible();
      await fitsNavigation(page, 'Orders');
      await expect(page.getByRole('tab', { name: 'Orders', exact: true })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await page.getByRole('tab', { name: 'More', exact: true }).click();
      await page.getByRole('link', { name: 'Analytics', exact: true }).click();
      await expect(page.getByText('Good food. Clear numbers.', { exact: true })).toBeVisible();
    }
    const pages = [
      ['orders', 'The order queue'],
      ['menu', 'Good food, on the menu.'],
      ['inventory', 'A well-stocked kitchen.'],
      ['analytics', 'Good food. Clear numbers.'],
      ['students', 'The people at our table.'],
      ['settings', 'Your canteen, your way.'],
    ];
    for (const [route, heading] of pages) {
      await page.goto(`/admin/${route}`);
      await expect(page.getByText(heading, { exact: true })).toBeVisible();
      await fitsPage(page);
      if (device.width < 768 && ['menu', 'students', 'settings'].includes(route)) {
        await fitsNavigation(page, 'More');
        await expect(page.getByRole('tab', { name: 'More', exact: true })).toHaveAttribute(
          'aria-selected',
          'true',
        );
      }
      if (route === 'analytics' || route === 'settings')
        await page.screenshot({ path: `test-results/responsive-${device.name}-${route}.png` });
    }
    expect(errors).toEqual([]);
  });
}

test('raised navigation follows direct links, reloads and browser history', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await signIn(page, 'student');
  await fitsNavigation(page, 'Home');
  await page.getByRole('tab', { name: 'Profile', exact: true }).click();
  await expect(page.getByText('A little about you.', { exact: true })).toBeVisible();
  await fitsNavigation(page, 'Profile');
  await page
    .getByTestId('navigation-dock')
    .screenshot({ path: 'test-results/navigation-active-profile.png' });
  await page.goBack();
  await expect(page.getByText('What are you craving today?', { exact: true })).toBeVisible();
  await fitsNavigation(page, 'Home');
  await page.goto('/cart');
  await expect(page.getByText('Your bag, your break.', { exact: true })).toBeVisible();
  await fitsNavigation(page, 'Cart');
  await page.reload();
  await expect(page.getByText('Your bag, your break.', { exact: true })).toBeVisible();
  await fitsNavigation(page, 'Cart');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('tab', { name: 'Menu', exact: true }).click();
  await expect(page.getByText('The campus menu', { exact: true })).toBeVisible();
  await fitsNavigation(page, 'Menu');
  await page
    .getByTestId('navigation-dock')
    .screenshot({ path: 'test-results/navigation-active-menu.png' });
  expect(errors).toEqual([]);
});

test('login remains usable on phones, tablets and desktop', async ({ page }) => {
  for (const device of devices) {
    await page.setViewportSize(device);
    await page.goto('/login');
    await expect(page.getByText('Welcome back.', { exact: true })).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() =>
          Array.from(document.fonts)
            .filter((face) => face.status === 'loaded')
            .map((face) => face.family.replace(/["']/g, '')),
        ),
      )
      .toEqual(
        expect.arrayContaining(['Inter_400Regular', 'Inter_700Bold', 'PlusJakartaSans_700Bold']),
      );
    await fitsScreen(page, page.getByRole('textbox', { name: 'Campus email', exact: true }));
    await fitsScreen(page, page.getByRole('button', { name: /^Sign in/ }));
    await page.screenshot({ path: `test-results/responsive-${device.name}-login.png` });
  }
});

test('tablet rotation and split-screen preserve the bag and reflow the menu', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await signIn(page, 'student');
  await page
    .getByRole('button', { name: 'Add Chicken Adobo with Rice to bag', exact: true })
    .click();
  await page.getByRole('button', { name: 'Dismiss notification', exact: true }).click();
  for (const size of [
    { width: 1024, height: 768 },
    { width: 600, height: 900 },
    { width: 1440, height: 1000 },
  ]) {
    await page.setViewportSize(size);
    await fitsPage(page);
    await fitsScreen(page, page.getByTestId('meal-card').first());
  }
  await page.goto('/cart');
  await expect(page.getByText('Chicken Adobo with Rice', { exact: true })).toBeVisible();
});
