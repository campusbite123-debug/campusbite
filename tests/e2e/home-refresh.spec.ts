import { expect, test } from '@playwright/test';
import { FIXED_TIME, mockSupabase, signIn } from './helpers/supabase';

test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

test('pulling down from the top of Home refreshes stock and keeps the current search', async ({
  page,
  context,
}) => {
  const { data } = await mockSupabase(context);
  await page.clock.install({ time: new Date(FIXED_TIME) });
  await signIn(page, 'student');
  const search = page.getByPlaceholder('Search for your next favorite meal…');
  await search.fill('adobo');
  await search.blur();
  const add = page.getByRole('button', { name: 'Add Chicken Adobo with Rice to bag' });
  await expect(add).toBeEnabled();

  const scroll = page.getByTestId('page-scroll');
  const touch = await context.newCDPSession(page);
  const bounds = (await scroll.boundingBox())!;
  const x = Math.round(bounds.x + 40);
  const y = Math.round(bounds.y + 60);
  async function drag(dx: number, dy: number) {
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let step = 1; step <= 4; step++) {
      await touch.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x + (dx * step) / 4, y: y + (dy * step) / 4 }],
      });
    }
  }
  const release = () =>
    touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const cue = page.getByText('Release to refresh', { exact: true });
  await scroll.evaluate((el) => {
    el.scrollTop = 160;
  });
  await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  await drag(0, 110);
  await expect(cue).toBeHidden();
  await release();
  await scroll.evaluate((el) => {
    el.scrollTop = 0;
  });
  await drag(110, 15);
  await expect(cue).toBeHidden();
  await release();
  await drag(0, 120);
  await expect(cue).toBeVisible();

  for (const menu of data.menus) if (menu.meal_id === 'adobo') menu.quantity = 0;
  await Promise.all([page.waitForRequest('**/rest/v1/meal_inventory?**'), release()]);
  await expect(add).toBeDisabled();
  await expect(search).toHaveValue('adobo');
  await expect(page).toHaveURL(/\/home$/);
});
