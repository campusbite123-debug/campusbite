import { expect, test, type Locator } from '@playwright/test';
import { FIXED_TIME, mockSupabase, signIn } from './helpers/supabase';

async function opacity(locator: Locator) {
  return locator.evaluate((element) => Number(getComputedStyle(element).opacity));
}

async function fluidState(page: import('@playwright/test').Page) {
  const fill = await page.getByTestId('tea-fill').getAttribute('d');
  const surface = await page.getByTestId('tea-surface').getAttribute('d');
  const jet = await page.getByTestId('tea-jet').getAttribute('d');
  const ice = await page
    .getByTestId('tea-ice-0')
    .evaluate((element) => getComputedStyle(element).transform);
  const droplet = page.getByTestId('tea-droplet-0');
  return {
    fill,
    surface,
    jet,
    ice,
    dropletX: await droplet.getAttribute('cx'),
    dropletY: await droplet.getAttribute('cy'),
  };
}

test('iced tea deforms inside a fixed glass, splashes with moving droplets and settles once', async ({
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
  await page.getByRole('button', { name: 'View House Iced Tea', exact: true }).click();
  await page.getByRole('button', { name: 'See ingredients', exact: true }).click();

  const stage = page.getByTestId('ingredient-stage');
  const glass = page.getByTestId('ingredient-layer-1');
  const fill = page.getByTestId('tea-fill');
  const splash = page.getByTestId('tea-splash');
  const jet = page.getByTestId('tea-jet');
  await page.clock.runFor(300);
  const glassAtOpen = (await glass.boundingBox())!;
  const initial = await fluidState(page);
  expect(initial.fill).toBeTruthy();
  expect(initial.surface).toBeTruthy();
  expect(initial.ice).toBeTruthy();
  expect(await opacity(fill)).toBeGreaterThan(0);
  expect(await opacity(splash)).toBe(0);
  expect(await opacity(jet)).toBe(0);
  await stage.screenshot({ path: 'test-results/iced-tea-in-glass.png' });

  await page.clock.runFor(800);
  const earlyMotion = await fluidState(page);
  await page.clock.runFor(200);
  expect(await opacity(fill)).toBeGreaterThan(0);
  expect(await opacity(jet)).toBeGreaterThan(0);
  expect(await opacity(splash)).toBeGreaterThan(0);
  await page.clock.runFor(100);
  const laterMotion = await fluidState(page);
  expect(laterMotion.fill).not.toBe(earlyMotion.fill);
  expect(laterMotion.surface).not.toBe(earlyMotion.surface);
  expect(laterMotion.jet).not.toBe(earlyMotion.jet);
  expect(laterMotion.ice).not.toBe(earlyMotion.ice);
  expect(laterMotion.dropletX).toBeTruthy();
  expect(laterMotion.dropletY).toBeTruthy();
  expect(laterMotion.dropletX).not.toBe(earlyMotion.dropletX);
  expect(laterMotion.dropletY).not.toBe(earlyMotion.dropletY);
  await stage.screenshot({ path: 'test-results/iced-tea-fluid-mid.png' });

  await page.clock.runFor(3100);
  const glassAtEnd = (await glass.boundingBox())!;
  expect(glassAtEnd.x).toBeCloseTo(glassAtOpen.x, 0);
  expect(glassAtEnd.y).toBeCloseTo(glassAtOpen.y, 0);
  expect(glassAtEnd.width).toBeCloseTo(glassAtOpen.width, 0);
  expect(glassAtEnd.height).toBeCloseTo(glassAtOpen.height, 0);
  expect(await opacity(fill)).toBeGreaterThan(0);
  expect(await opacity(jet)).toBe(0);
  expect(await opacity(splash)).toBe(0);
  await expect(page.getByTestId('ingredient-callout-0')).toHaveText('Brewed tea');
  await expect(page.getByTestId('ingredient-callout-2')).toHaveText('Ice');
  await expect(
    page.getByRole('button', { name: /^(Show layers|Bring together|Replay)$/ }),
  ).toHaveCount(0);
  const settled = await fluidState(page);
  await stage.screenshot({ path: 'test-results/iced-tea-settled.png' });

  await page.clock.runFor(6000);
  expect(await fluidState(page)).toEqual(settled);
  expect(await opacity(fill)).toBeGreaterThan(0);
  expect(await opacity(jet)).toBe(0);
  expect(await opacity(splash)).toBe(0);

  await page.getByRole('button', { name: 'Back to meal', exact: true }).click();
  await page.getByRole('button', { name: 'See ingredients', exact: true }).click();
  await page.clock.runFor(300);
  const reopened = await fluidState(page);
  expect(reopened.fill).toBe(initial.fill);
  expect(reopened.surface).toBe(initial.surface);
  expect(reopened.ice).toBe(initial.ice);
  expect(await opacity(fill)).toBeGreaterThan(0);
  expect(await opacity(splash)).toBe(0);
  expect(await opacity(jet)).toBe(0);
  expect(errors).toEqual([]);
});

test('reduced motion opens settled tea immediately with aligned ingredient pointers', async ({
  context,
  page,
}) => {
  await mockSupabase(context);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date(FIXED_TIME) });
  await signIn(page, 'student');
  await page.getByRole('button', { name: 'View House Iced Tea', exact: true }).click();
  await page.getByRole('button', { name: 'See ingredients', exact: true }).click();

  const fill = page.getByTestId('tea-fill');
  expect(await opacity(fill)).toBeGreaterThan(0);
  expect(await opacity(page.getByTestId('tea-jet'))).toBe(0);
  expect(await opacity(page.getByTestId('tea-splash'))).toBe(0);
  for (const [index, label] of [
    [0, 'Brewed tea'],
    [2, 'Ice'],
  ] as const) {
    await expect(page.getByTestId(`ingredient-callout-${index}`)).toHaveText(label);
    const layer = (await page.getByTestId(`ingredient-layer-${index}`).boundingBox())!;
    const anchor = (await page.getByTestId(`ingredient-anchor-${index}`).boundingBox())!;
    expect(anchor.x).toBeGreaterThan(layer.x);
    expect(anchor.x + anchor.width).toBeLessThan(layer.x + layer.width);
    expect(anchor.y).toBeGreaterThan(layer.y);
    expect(anchor.y + anchor.height).toBeLessThan(layer.y + layer.height);
  }
  const settled = await fluidState(page);
  await page.clock.runFor(5000);
  expect(await fluidState(page)).toEqual(settled);
});
