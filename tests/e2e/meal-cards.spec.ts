import { test, expect } from '@playwright/test';
import { FIXED_TIME, mockSupabase, signIn } from './helpers/supabase';

test('meal cards show bag quantities and prevent additions beyond available stock', async ({
  context,
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { data } = await mockSupabase(context);
  data.menus.forEach((menu) => {
    if (menu.meal_id === 'adobo') menu.quantity = 2;
    if (menu.meal_id === 'burger') menu.quantity = 0;
    if (menu.meal_id === 'water') {
      menu.available_from = '23:00:00';
      menu.available_until = '23:30:00';
    }
  });
  await page.clock.install({ time: new Date(FIXED_TIME) });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await signIn(page, 'student');
  await page.getByRole('tab', { name: 'Menu', exact: true }).click();
  const card = (name: string) =>
    page.getByTestId('meal-card').filter({
      has: page.getByRole('button', { name: `View ${name}`, exact: true }),
    });
  const adobo = card('Chicken Adobo with Rice');
  const add = adobo.getByRole('button', {
    name: 'Add Chicken Adobo with Rice to bag',
    exact: true,
  });
  await expect(adobo.getByText('₱75', { exact: true })).toBeVisible();
  await add.click();
  await expect(adobo.getByTestId('meal-in-bag-count')).toHaveText('1');
  await add.click();
  await expect(adobo.getByTestId('meal-in-bag-count')).toHaveText('2');
  await expect(add).toBeDisabled();
  await expect(add.getByText('Added', { exact: true })).toBeVisible();
  await expect(page.getByTestId('navigation-cart-count')).toHaveText('2');

  const burger = card('Classic Campus Burger');
  await expect(burger.getByText('Sold out today', { exact: true })).toHaveCount(1);
  await expect(
    burger.getByRole('button', { name: 'Add Classic Campus Burger to bag', exact: true }),
  ).toBeDisabled();
  const water = card('Bottled Water');
  await expect(water.getByText('Pickup unavailable', { exact: true })).toHaveCount(1);
  await expect(
    water.getByRole('button', { name: 'Add Bottled Water to bag', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Dismiss notification', exact: true }).click();
  await adobo.getByRole('button', { name: 'View Chicken Adobo with Rice', exact: true }).click();
  await expect(page.getByText('A closer look', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await expect(page.getByText('A closer look', { exact: true })).not.toBeVisible();
  await adobo.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/meal-card-availability-phone.png' });
  expect(errors).toEqual([]);
});

test('paused meal cards keep details accessible and explain the disabled Add button', async ({
  context,
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { data } = await mockSupabase(context);
  data.settings.accepting_orders = false;
  await page.clock.install({ time: new Date(FIXED_TIME) });
  await signIn(page, 'student');
  const card = page.getByTestId('meal-card').filter({
    has: page.getByRole('button', { name: 'View Chicken Adobo with Rice', exact: true }),
  });
  await expect(card.getByText('Pre-orders paused', { exact: true })).toHaveCount(1);
  const add = card.getByRole('button', { name: 'Add Chicken Adobo with Rice to bag', exact: true });
  await expect(add).toBeDisabled();
  await expect(add).toHaveText('Paused');
  await card.getByRole('button', { name: 'View Chicken Adobo with Rice', exact: true }).click();
  await expect(page.getByText('A closer look', { exact: true })).toBeVisible();
});
