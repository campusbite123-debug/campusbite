import { expect, test, type Locator, type Page } from '@playwright/test';
import { FIXED_TIME, mockSupabase, signIn } from './helpers/supabase';

async function background(locator: Locator) {
  return locator.evaluate((element) => getComputedStyle(element).backgroundColor);
}

async function headingFrame(page: Page, title: string, stroke: string) {
  const heading = page.getByTestId('page-heading');
  await expect(heading.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await expect(heading.locator('path[stroke]')).toHaveAttribute('stroke', stroke);
}

test.beforeEach(async ({ context, page }) => {
  await mockSupabase(context);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date(FIXED_TIME) });
});

test('quote headings and all five palettes work on a small phone and persist across pages', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await signIn(page, 'student');
  await page.getByRole('tab', { name: 'Orders', exact: true }).click();
  await headingFrame(page, 'Your orders', '#24513D');
  const heading = page.getByTestId('page-heading');
  await expect(heading.getByText('FROM OUR KITCHEN TO YOUR BREAK', { exact: true })).toBeVisible();
  await expect(
    heading.getByText('A little anticipation makes everything taste better.', { exact: true }),
  ).toBeVisible();
  await page.clock.runFor(400);
  await page.screenshot({ path: 'test-results/order-heading-green.png' });
  await page.getByRole('tab', { name: 'Profile', exact: true }).click();
  await headingFrame(page, 'A little about you.', '#24513D');
  const name = page.getByRole('textbox', { name: 'Full name', exact: true });
  await name.fill('Unsaved profile name');
  const palettes = [
    ['Sunset orange', '#B84717', 'rgb(184, 71, 23)'],
    ['Berry', '#9C3459', 'rgb(156, 52, 89)'],
    ['Ocean blue', '#24658A', 'rgb(36, 101, 138)'],
    ['Cocoa', '#79523A', 'rgb(121, 82, 58)'],
    ['Campus green', '#24513D', 'rgb(36, 81, 61)'],
  ];
  await expect(page.getByRole('radio')).toHaveCount(5);
  for (const [label, stroke, color] of palettes) {
    const option = page.getByRole('radio', { name: label, exact: true });
    await option.click();
    await expect(option).toBeChecked();
    await expect(name).toHaveValue('Unsaved profile name');
    await expect
      .poll(() => background(page.getByRole('button', { name: 'Save profile', exact: true })))
      .toBe(color);
    await expect(heading.locator('path[stroke]')).toHaveAttribute('stroke', stroke);
    const bounds = (await option.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(321);
  }
  await page.getByRole('radio', { name: 'Sunset orange', exact: true }).click();
  await page
    .getByRole('radiogroup', { name: 'Color palette', exact: true })
    .scrollIntoViewIfNeeded();
  await page.clock.runFor(400);
  await page.screenshot({ path: 'test-results/palette-picker-phone.png' });
  await page.getByRole('tab', { name: 'Orders', exact: true }).click();
  await headingFrame(page, 'Your orders', '#B84717');
  await page.clock.runFor(400);
  await page.screenshot({ path: 'test-results/order-heading-orange.png' });
  await page.getByRole('tab', { name: 'Menu', exact: true }).click();
  await headingFrame(page, 'Fresh picks. Happy breaks.', '#B84717');
  await page.getByRole('tab', { name: 'Home', exact: true }).click();
  await expect.poll(() => background(page.getByTestId('featured-banner'))).toBe('rgb(56, 32, 21)');
  await expect(
    page.getByTestId('featured-banner').getByText('Good food.', { exact: true }),
  ).toHaveCSS('color', 'rgb(255, 255, 255)');
  await page.reload();
  await expect(page.getByTestId('featured-banner')).toBeVisible();
  await expect.poll(() => background(page.getByTestId('featured-banner'))).toBe('rgb(56, 32, 21)');
  await page.getByRole('tab', { name: 'Profile', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Sunset orange', exact: true })).toBeChecked();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
  ).toBeLessThanOrEqual(1);
});

test('changing palette keeps the bag intact and colors meal dialogs', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, 'student');
  await page.getByRole('button', { name: 'Add House Iced Tea to bag', exact: true }).click();
  await page.getByRole('button', { name: 'Dismiss notification', exact: true }).click();
  await page.getByRole('tab', { name: 'Profile', exact: true }).click();
  await page.getByRole('radio', { name: 'Berry', exact: true }).click();
  await page.getByRole('tab', { name: /Cart/ }).click();
  await headingFrame(page, 'Your bag, your break.', '#9C3459');
  await expect(page.getByText('House Iced Tea', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Menu', exact: true }).click();
  await page.getByRole('button', { name: 'View Classic Campus Burger', exact: true }).click();
  await expect(page.getByText('See ingredients', { exact: true })).toHaveCSS(
    'color',
    'rgb(64, 39, 54)',
  );
  await page.getByRole('button', { name: 'See ingredients', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Back to meal', exact: true })).toHaveCSS(
    'background-color',
    'rgb(112, 35, 63)',
  );
});

test('administrators can choose the same palettes and their dashboard heading follows', async ({
  page,
}) => {
  await signIn(page, 'admin');
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await headingFrame(page, 'Your canteen, your way.', '#24513D');
  await page.getByRole('radio', { name: 'Ocean blue', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save canteen settings', exact: true })).toHaveCSS(
    'background-color',
    'rgb(36, 101, 138)',
  );
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
  await headingFrame(page, 'A good day starts here.', '#24658A');
  await page.clock.runFor(400);
  await page.screenshot({ path: 'test-results/admin-heading-ocean.png' });
});
