import { expect, test, type Locator, type Page } from '@playwright/test';
import { FIXED_TIME, mockSupabase, signIn } from './helpers/supabase';

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (/useNativeDriver|native animated module is missing/.test(message.text()))
      errors.push(message.text());
  });
  return errors;
}

async function center(locator: Locator) {
  const bounds = (await locator.boundingBox())!;
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

async function pauseAfterLayout(page: Page) {
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
}

for (const width of [390, 1440]) {
  test(`adding a meal flies toward the cart and restores its icon at ${width}px`, async ({
    context,
    page,
  }, testInfo) => {
    await mockSupabase(context);
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.clock.install({ time: new Date(FIXED_TIME) });
    const errors = watchErrors(page);
    await signIn(page, 'student');
    if (width < 768) await page.getByRole('tab', { name: 'Menu', exact: true }).click();
    else await page.getByRole('link', { name: 'Menu', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Add House Iced Tea to bag', exact: true }),
    ).toBeVisible();
    const logo = page.getByTestId('brand-mark').first();
    await expect(logo).toBeVisible();
    await expect(logo.locator('path')).toHaveAttribute('stroke', '#FFFFFF');
    await expect(logo.locator('rect')).toHaveCount(5);
    await pauseAfterLayout(page);
    await logo.locator('..').screenshot({ path: testInfo.outputPath(`brand-mark-${width}.png`) });

    const target = page.getByTestId('cart-animation-target');
    const destination = await center(target);
    const card = page.getByTestId('meal-card').filter({
      has: page.getByRole('button', { name: 'View House Iced Tea', exact: true }),
    });
    await card.getByRole('button', { name: 'Add House Iced Tea to bag', exact: true }).click();
    await page.clock.runFor(32);
    const flight = page.getByTestId('cart-flight');
    await expect(flight).toHaveCount(1);
    await expect(card.getByTestId('meal-in-bag-count')).toHaveText('1');
    await page.clock.runFor(80);
    const atStart = await center(flight);
    await page.clock.runFor(260);
    const inFlight = await center(flight);
    expect(distance(inFlight, destination)).toBeLessThan(distance(atStart, destination));
    expect(distance(inFlight, atStart)).toBeGreaterThan(25);
    await page.screenshot({
      path: testInfo.outputPath(`cart-flight-${width < 768 ? 'mobile' : 'desktop'}.png`),
    });
    await page.clock.runFor(300);
    expect(distance(await center(flight), destination)).toBeLessThan(30);
    await page.clock.runFor(400);
    await expect(flight).toHaveCount(0);
    if (width < 768) await expect(page.getByTestId('navigation-cart-count')).toHaveText('1');
    else await expect(page.getByRole('link', { name: 'Cart', exact: true })).toContainText('1');
    expect(errors).toEqual([]);
  });
}

test('adding a chosen quantity from meal details flies once and keeps that quantity', async ({
  context,
  page,
}) => {
  await mockSupabase(context);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install({ time: new Date(FIXED_TIME) });
  const errors = watchErrors(page);
  await signIn(page, 'student');
  await page.getByRole('button', { name: 'View Classic Campus Burger', exact: true }).click();
  await expect(page.getByText('A closer look', { exact: true })).toBeVisible();
  await pauseAfterLayout(page);
  await page.getByRole('button', { name: 'Increase quantity', exact: true }).click();
  await page.getByRole('button', { name: /^Add to bag/ }).click();
  await page.clock.runFor(32);
  await expect(page.getByTestId('cart-flight')).toHaveCount(1);
  await expect(page.getByTestId('navigation-cart-count')).toHaveText('2');
  await page.clock.runFor(1100);
  await expect(page.getByTestId('cart-flight')).toHaveCount(0);
  await expect(page.getByText('A closer look', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Dismiss notification', exact: true }).click();
  await page.getByRole('tab', { name: 'Cart', exact: true }).click();
  await expect(page.getByText('Classic Campus Burger', { exact: true })).toBeVisible();
  await expect(page.getByTestId('navigation-cart-count')).toHaveText('2');
  expect(errors).toEqual([]);
});

test('reduced motion adds to the bag without a flying image and prevents a second addition at the stock limit', async ({
  context,
  page,
}) => {
  const { data } = await mockSupabase(context);
  data.menus.forEach((menu) => {
    if (menu.meal_id === 'tea') menu.quantity = 1;
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date(FIXED_TIME) });
  const errors = watchErrors(page);
  await signIn(page, 'student');
  const add = page.getByRole('button', { name: 'Add House Iced Tea to bag', exact: true });
  await add.click();
  await expect(page.getByTestId('navigation-cart-count')).toHaveText('1');
  await expect(page.getByTestId('cart-flight')).toHaveCount(0);
  await expect(add).toBeDisabled();
  await page.clock.runFor(1500);
  await expect(page.getByTestId('cart-flight')).toHaveCount(0);
  expect(errors).toEqual([]);
});
