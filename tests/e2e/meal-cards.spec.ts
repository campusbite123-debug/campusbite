import { test, expect } from '@playwright/test';
import { FIXED_TIME, mockSupabase, signIn } from './helpers/supabase';

test('ingredients follow the selected meal and return to its details', async ({
  context,
  page,
}) => {
  await mockSupabase(context);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date(FIXED_TIME) });
  await signIn(page, 'student');
  for (const [name, ingredient] of [
    ['Classic Campus Burger', 'Beef patty'],
    ['Pancit Canton', 'Egg noodles'],
  ]) {
    await page.getByRole('button', { name: `View ${name}`, exact: true }).click();
    await page.getByRole('button', { name: 'Increase quantity' }).click();
    const addLabel = await page
      .getByRole('button', { name: /^Add to bag/ })
      .getAttribute('aria-label');
    await page.getByRole('button', { name: 'See ingredients' }).click();
    if (ingredient === 'Beef patty') await page.clock.runFor(2300);
    await expect(page.getByText(ingredient, { exact: true })).toBeVisible();
    if (ingredient === 'Beef patty') {
      await page.clock.runFor(2300);
      await page.getByTestId('ingredient-stage').scrollIntoViewIfNeeded();
      await page.screenshot({ path: 'test-results/burger-ingredients.png' });
    } else await expect(page.getByText('Beef patty', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Back to meal' }).click();
    await expect(page.getByRole('button', { name: /^Add to bag/ })).toHaveAttribute(
      'aria-label',
      addLabel!,
    );
    await expect(page.getByRole('button', { name: 'See ingredients' })).toBeVisible();
    await page.getByRole('button', { name: 'Close dialog' }).click();
  }
});

test('burger separates once, labels its layers and restarts only when ingredients reopen', async ({
  context,
  page,
}) => {
  await mockSupabase(context);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install({ time: new Date(FIXED_TIME) });
  await signIn(page, 'student');
  await page.getByRole('button', { name: 'View Classic Campus Burger', exact: true }).click();
  await page.getByRole('button', { name: 'See ingredients' }).click();
  const stage = page.getByTestId('ingredient-stage');
  const top = page.getByTestId('ingredient-layer-0');
  const base = page.getByTestId('ingredient-layer-5');
  const offset = async () => {
    const frame = (await stage.boundingBox())!;
    return {
      top: (await top.boundingBox())!.y - frame.y,
      base: (await base.boundingBox())!.y - frame.y,
    };
  };
  await expect(
    page.getByRole('button', { name: /^(Show layers|Bring together|Replay)$/ }),
  ).toHaveCount(0);
  await page.clock.runFor(300);
  const assembled = await offset();
  await stage.screenshot({ path: 'test-results/burger-assembled.png' });
  await page.clock.runFor(700);
  const midway = await offset();
  expect(midway.top).toBeLessThan(assembled.top - 1);
  expect(midway.base).toBeGreaterThan(assembled.base + 1);
  await page.clock.runFor(1500);
  const separated = await offset();
  expect(separated.top).toBeLessThan(midway.top - 10);
  expect(separated.base).toBeGreaterThan(midway.base + 10);
  const labels = ['Sesame bun', 'Signature sauce', 'Lettuce', 'Tomato', 'Beef patty', 'Sesame bun'];
  for (const [index, label] of labels.entries()) {
    const callout = page.getByTestId(`ingredient-callout-${index}`);
    await expect(callout).toBeVisible();
    await expect(callout).toContainText(label);
    const layerBox = (await page.getByTestId(`ingredient-layer-${index}`).boundingBox())!;
    const anchorBox = (await page.getByTestId(`ingredient-anchor-${index}`).boundingBox())!;
    expect(anchorBox.x).toBeGreaterThan(layerBox.x);
    expect(anchorBox.x + anchorBox.width).toBeLessThan(layerBox.x + layerBox.width);
    expect(anchorBox.y).toBeGreaterThan(layerBox.y);
    expect(anchorBox.y + anchorBox.height).toBeLessThan(layerBox.y + layerBox.height);
  }
  await stage.screenshot({ path: 'test-results/burger-separated.png' });
  await page.clock.runFor(6000);
  expect((await offset()).top).toBeCloseTo(separated.top, 0);
  expect((await offset()).base).toBeCloseTo(separated.base, 0);
  await page.getByRole('button', { name: 'Back to meal' }).click();
  await page.getByRole('button', { name: 'See ingredients' }).click();
  await page.clock.runFor(300);
  expect((await offset()).top).toBeCloseTo(assembled.top, 0);
  expect((await offset()).base).toBeCloseTo(assembled.base, 0);
  await page.clock.runFor(2200);
  expect((await offset()).top).toBeCloseTo(separated.top, 0);
  expect((await offset()).base).toBeCloseTo(separated.base, 0);
});

test('reduced motion shows labeled burger layers immediately without playback controls', async ({
  context,
  page,
}) => {
  await mockSupabase(context);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date(FIXED_TIME) });
  await signIn(page, 'student');
  await page.getByRole('button', { name: 'View Classic Campus Burger', exact: true }).click();
  await page.getByRole('button', { name: 'See ingredients' }).click();
  const top = page.getByTestId('ingredient-layer-0');
  const base = page.getByTestId('ingredient-layer-5');
  const topAtOpen = (await top.boundingBox())!.y;
  const baseAtOpen = (await base.boundingBox())!.y;
  const stageHeight = (await page.getByTestId('ingredient-stage').boundingBox())!.height;
  expect(baseAtOpen - topAtOpen).toBeGreaterThan(stageHeight * 0.5);
  for (let index = 0; index < 6; index++) {
    await expect(page.getByTestId(`ingredient-callout-${index}`)).toBeVisible();
  }
  await expect(
    page.getByRole('button', { name: /^(Show layers|Bring together|Replay)$/ }),
  ).toHaveCount(0);
  await page.clock.runFor(3000);
  expect((await top.boundingBox())!.y).toBeCloseTo(topAtOpen, 0);
  expect((await base.boundingBox())!.y).toBeCloseTo(baseAtOpen, 0);
  for (const viewport of [
    { width: 320, height: 640 },
    { width: 768, height: 1024 },
  ]) {
    await page.setViewportSize(viewport);
    await page.clock.runFor(100);
    const stage = page.getByTestId('ingredient-stage');
    await stage.scrollIntoViewIfNeeded();
    for (let index = 0; index < 6; index++) {
      const label = (await page.getByTestId(`ingredient-callout-${index}`).boundingBox())!;
      const anchor = (await page.getByTestId(`ingredient-anchor-${index}`).boundingBox())!;
      const layer = (await page.getByTestId(`ingredient-layer-${index}`).boundingBox())!;
      expect(label.x).toBeGreaterThanOrEqual(0);
      expect(anchor.x).toBeGreaterThan(layer.x);
      expect(anchor.x + anchor.width).toBeLessThan(layer.x + layer.width);
      expect(anchor.y).toBeGreaterThan(layer.y);
      expect(anchor.y + anchor.height).toBeLessThan(layer.y + layer.height);
    }
    await stage.screenshot({ path: `test-results/burger-labels-${viewport.width}.png` });
  }
});

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
