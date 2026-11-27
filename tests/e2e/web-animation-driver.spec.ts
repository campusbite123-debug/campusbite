import { expect, test, type Page } from '@playwright/test';
import { FIXED_TIME, mockSupabase, signIn } from './helpers/supabase';

function animationWarnings(page: Page) {
  const warnings: string[] = [];
  page.on('console', (message) => {
    if (/useNativeDriver|native animated module is missing/.test(message.text()))
      warnings.push(message.text());
  });
  return warnings;
}

test.beforeEach(async ({ context, page }) => {
  await mockSupabase(context);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install({ time: new Date(FIXED_TIME) });
});

for (const width of [390, 1440]) {
  test(`dialogs animate and dismiss without native-driver warnings at ${width}px`, async ({
    page,
  }) => {
    const warnings = animationWarnings(page);
    await page.setViewportSize({ width, height: 900 });
    await signIn(page, 'student');
    await page.getByRole('button', { name: 'View Classic Campus Burger', exact: true }).click();
    await expect(page.getByText('A closer look', { exact: true })).toBeVisible();
    await page.clock.runFor(350);
    expect(warnings).toEqual([]);
    await expect(page.getByTestId('modal-surface')).toHaveCSS('opacity', '1');
    await page.getByRole('button', { name: 'See ingredients', exact: true }).click();
    await expect(page.getByTestId('ingredient-stage')).toBeVisible();
    await page.getByRole('button', { name: 'Back to meal', exact: true }).click();
    await page.keyboard.press('Escape');
    await page.clock.runFor(350);
    await expect(page.getByText('A closer look', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'View notifications', exact: true }).click();
    await expect(page.getByText('Notifications', { exact: true })).toBeVisible();
    await page.clock.runFor(350);
    await page.getByTestId('modal-backdrop').click({ position: { x: 3, y: 3 } });
    await page.clock.runFor(350);
    await expect(page.getByText('Notifications', { exact: true })).toHaveCount(0);
    expect(warnings).toEqual([]);
  });
}

test('checkout confirmation and receipt animate without native-driver warnings', async ({
  page,
}) => {
  const warnings = animationWarnings(page);
  await signIn(page, 'student');
  await page.getByRole('button', { name: 'Add House Iced Tea to bag', exact: true }).click();
  await page.getByRole('button', { name: 'Dismiss notification', exact: true }).click();
  await page.getByRole('link', { name: /Cart/ }).click();
  await page.getByRole('button', { name: 'Confirm pre-order', exact: true }).click();
  await expect(page.getByText('Your pre-order is in!', { exact: true })).toBeVisible();
  await page.clock.runFor(350);
  await expect(page.getByTestId('modal-surface')).toHaveCSS('opacity', '1');
  await page.getByRole('button', { name: 'Track my order', exact: true }).click();
  await expect(page.getByText('Your digital receipt', { exact: true })).toBeVisible();
  await page.clock.runFor(350);
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.clock.runFor(350);
  expect(warnings).toEqual([]);
});
