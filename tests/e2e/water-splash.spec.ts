import { expect, test, type Locator } from '@playwright/test';
import { FIXED_TIME, mockSupabase, signIn } from './helpers/supabase';

async function opacity(locator: Locator) {
  return locator.evaluate((element) => Number(getComputedStyle(element).opacity));
}

async function expectJetAtMouth(jet: Locator, neck: Locator) {
  const jetBounds = (await jet.boundingBox())!;
  const neckBounds = (await neck.boundingBox())!;
  const mouthX = neckBounds.x + neckBounds.width / 2;
  const mouthY = neckBounds.y + neckBounds.height / 2;
  expect(jetBounds.x).toBeLessThanOrEqual(mouthX);
  expect(jetBounds.x + jetBounds.width).toBeGreaterThanOrEqual(mouthX);
  expect(jetBounds.y).toBeLessThanOrEqual(mouthY);
  expect(jetBounds.y + jetBounds.height).toBeGreaterThanOrEqual(mouthY);
}

test('water drains from the bottle and splashes through the neck once', async ({
  context,
  page,
}) => {
  await mockSupabase(context);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install({ time: new Date(FIXED_TIME) });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await signIn(page, 'student');
  await page.getByRole('button', { name: 'View Bottled Water', exact: true }).click();
  await page.getByRole('button', { name: 'See ingredients', exact: true }).click();

  const stage = page.getByTestId('ingredient-stage');
  const bottle = page.getByTestId('ingredient-layer-1');
  const fill = page.getByTestId('water-fill');
  const jet = page.getByTestId('water-jet');
  const neck = page.getByTestId('water-neck');
  const splash = page.getByTestId('water-splash');
  await page.clock.runFor(300);
  const bottleAtOpen = (await bottle.boundingBox())!;
  const fillAtOpen = (await fill.boundingBox())!;
  expect(await opacity(fill)).toBeGreaterThan(0);
  expect(await opacity(splash)).toBe(0);
  await stage.screenshot({ path: 'test-results/water-inside-bottle.png' });

  await page.clock.runFor(1000);
  const fillMidway = (await fill.boundingBox())!;
  expect(fillMidway.height).toBeLessThan(fillAtOpen.height - 5);
  expect(await opacity(jet)).toBeGreaterThan(0);
  expect(await opacity(splash)).toBeGreaterThan(0);
  await expectJetAtMouth(jet, neck);
  await stage.screenshot({ path: 'test-results/water-leaving-neck.png' });

  await page.clock.runFor(1500);
  const bottleAtEnd = (await bottle.boundingBox())!;
  expect(bottleAtEnd.x).toBeCloseTo(bottleAtOpen.x, 0);
  expect(bottleAtEnd.y).toBeCloseTo(bottleAtOpen.y, 0);
  expect(bottleAtEnd.width).toBeCloseTo(bottleAtOpen.width, 0);
  expect(bottleAtEnd.height).toBeCloseTo(bottleAtOpen.height, 0);
  expect(await opacity(fill)).toBeLessThan(0.1);
  expect(await opacity(splash)).toBeGreaterThan(0.95);
  await expectJetAtMouth(jet, neck);
  const plume = (await page.getByTestId('ingredient-layer-0').boundingBox())!;
  const mouth = (await neck.boundingBox())!;
  expect(Math.abs(plume.y + plume.height - (mouth.y + mouth.height / 2))).toBeLessThan(2);
  await expect(page.getByTestId('ingredient-callout-0')).toHaveText('Purified water');
  await expect(
    page.getByRole('button', { name: /^(Show layers|Bring together|Replay)$/ }),
  ).toHaveCount(0);
  await stage.screenshot({ path: 'test-results/water-splash.png' });

  const splashAtEnd = (await splash.boundingBox())!;
  await page.clock.runFor(6000);
  const splashAfterWait = (await splash.boundingBox())!;
  expect(splashAfterWait.x).toBeCloseTo(splashAtEnd.x, 0);
  expect(splashAfterWait.y).toBeCloseTo(splashAtEnd.y, 0);
  expect(await opacity(splash)).toBeGreaterThan(0.95);
  await expectJetAtMouth(page.getByTestId('water-jet'), page.getByTestId('water-neck'));
  expect(await opacity(fill)).toBeLessThan(0.1);

  await page.getByRole('button', { name: 'Back to meal', exact: true }).click();
  await page.getByRole('button', { name: 'See ingredients', exact: true }).click();
  await page.clock.runFor(300);
  expect(await opacity(fill)).toBeGreaterThan(0);
  expect(await opacity(splash)).toBe(0);
  expect((await fill.boundingBox())!.height).toBeCloseTo(fillAtOpen.height, 0);
  expect(errors).toEqual([]);
});

test('reduced motion opens the finished water splash immediately', async ({ context, page }) => {
  await mockSupabase(context);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date(FIXED_TIME) });
  await signIn(page, 'student');
  await page.getByRole('button', { name: 'View Bottled Water', exact: true }).click();
  await page.getByRole('button', { name: 'See ingredients', exact: true }).click();
  const fill = page.getByTestId('water-fill');
  const splash = page.getByTestId('water-splash');
  expect(await opacity(fill)).toBeLessThan(0.1);
  expect(await opacity(splash)).toBeGreaterThan(0.95);
  await expect(page.getByTestId('ingredient-callout-0')).toHaveText('Purified water');
  const initial = (await splash.boundingBox())!;
  await page.clock.runFor(5000);
  expect((await splash.boundingBox())!.y).toBeCloseTo(initial.y, 0);
  expect(await opacity(splash)).toBeGreaterThan(0.95);
});
