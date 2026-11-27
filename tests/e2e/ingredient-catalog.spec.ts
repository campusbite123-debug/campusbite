import { expect, test, type Locator } from '@playwright/test';
import { FIXED_TIME, mockSupabase, signIn } from './helpers/supabase';

async function layerPositions(stage: Locator) {
  const frame = (await stage.boundingBox())!;
  return Promise.all(
    (await stage.getByTestId(/^ingredient-layer-\d+$/).all()).map(async (layer) => {
      const bounds = (await layer.boundingBox())!;
      return { x: bounds.x - frame.x, y: bounds.y - frame.y };
    }),
  );
}

test('every current food and drink separates once into its own labeled ingredients', async ({
  context,
  page,
}) => {
  const { data } = await mockSupabase(context);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install({ time: new Date(FIXED_TIME) });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await signIn(page, 'student');
  await page.getByRole('tab', { name: 'Menu', exact: true }).click();

  for (const meal of data.meals) {
    await page.getByRole('button', { name: `View ${meal.name}`, exact: true }).click();
    await page.getByRole('button', { name: 'See ingredients', exact: true }).click();
    const stage = page.getByTestId('ingredient-stage');
    await expect(stage).toBeVisible();
    await page.clock.runFor(300);
    const assembled = await layerPositions(stage);
    const teaSurfaceAtOpen =
      meal.id === 'tea' ? await stage.getByTestId('tea-surface').getAttribute('d') : null;
    expect(assembled.length).toBeGreaterThanOrEqual(meal.ingredients!.length);
    if (meal.id === 'tea') {
      await page.clock.runFor(1000);
      const teaSurfaceInMotion = await stage.getByTestId('tea-surface').getAttribute('d');
      expect(teaSurfaceAtOpen).toBeTruthy();
      expect(teaSurfaceInMotion).not.toBe(teaSurfaceAtOpen);
      await page.clock.runFor(3200);
    } else await page.clock.runFor(2200);
    const separated = await layerPositions(stage);
    if (meal.id !== 'tea') {
      expect(
        separated.some(
          (position, index) =>
            Math.abs(position.x - assembled[index].x) > 5 ||
            Math.abs(position.y - assembled[index].y) > 5,
        ),
      ).toBe(true);
    }

    const callouts = stage.getByTestId(/^ingredient-callout-\d+$/);
    const labels: string[] = [];
    for (const callout of await callouts.all()) {
      await expect(callout).toBeVisible();
      labels.push((await callout.innerText()).trim());
      const index = (await callout.getAttribute('data-testid'))!.split('-').at(-1);
      const layer = (await stage.getByTestId(`ingredient-layer-${index}`).boundingBox())!;
      const anchor = (await stage.getByTestId(`ingredient-anchor-${index}`).boundingBox())!;
      expect(anchor.x).toBeGreaterThan(layer.x);
      expect(anchor.x + anchor.width).toBeLessThan(layer.x + layer.width);
      expect(anchor.y).toBeGreaterThan(layer.y);
      expect(anchor.y + anchor.height).toBeLessThan(layer.y + layer.height);
    }
    expect([...new Set(labels)].sort()).toEqual([...meal.ingredients!].sort());
    await expect(
      page.getByRole('button', { name: /^(Show layers|Bring together|Replay)$/ }),
    ).toHaveCount(0);
    await page.clock.runFor(6000);
    const settled = await layerPositions(stage);
    for (const [index, position] of settled.entries()) {
      expect(position.x).toBeCloseTo(separated[index].x, 0);
      expect(position.y).toBeCloseTo(separated[index].y, 0);
    }
    if (['chicken', 'noodles', 'tea', 'water'].includes(meal.id)) {
      await stage.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `test-results/ingredients-${meal.id}-phone.png` });
    }
    await page.getByRole('button', { name: 'Back to meal', exact: true }).click();
    await expect(page.getByRole('button', { name: 'See ingredients', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  }
  expect(errors).toEqual([]);
});

test('drink ingredient pointers stay aligned on small phones and tablets', async ({
  context,
  page,
}) => {
  const { data } = await mockSupabase(context);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date(FIXED_TIME) });
  await signIn(page, 'student');
  await page.getByRole('link', { name: 'View all meals', exact: true }).click();
  for (const viewport of [
    { width: 320, height: 640 },
    { width: 768, height: 1024 },
  ]) {
    await page.setViewportSize(viewport);
    for (const meal of data.meals.filter((item) => ['tea', 'water'].includes(item.id))) {
      await page.getByRole('button', { name: `View ${meal.name}`, exact: true }).click();
      await page.getByRole('button', { name: 'See ingredients', exact: true }).click();
      const stage = page.getByTestId('ingredient-stage');
      await stage.scrollIntoViewIfNeeded();
      for (const callout of await stage.getByTestId(/^ingredient-callout-\d+$/).all()) {
        await expect(callout).toBeVisible();
        const index = (await callout.getAttribute('data-testid'))!.split('-').at(-1);
        const layer = (await stage.getByTestId(`ingredient-layer-${index}`).boundingBox())!;
        const anchor = (await stage.getByTestId(`ingredient-anchor-${index}`).boundingBox())!;
        expect(anchor.x).toBeGreaterThan(layer.x);
        expect(anchor.x + anchor.width).toBeLessThan(layer.x + layer.width);
        expect(anchor.y).toBeGreaterThan(layer.y);
        expect(anchor.y + anchor.height).toBeLessThan(layer.y + layer.height);
      }
      await page.getByRole('button', { name: 'Back to meal', exact: true }).click();
      await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
    }
  }
});
