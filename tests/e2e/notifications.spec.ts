import { expect, test } from '@playwright/test';
import type { Order, Snapshot } from '@/types';
import { FIXED_TIME, fillLogin, mockSupabase, signIn, signOut } from './helpers/supabase';

function sampleOrder(data: Snapshot): Order {
  const customer = data.profiles.find((profile) => profile.email === 'student@school.test')!;
  const menu = data.menus[0];
  const meal = data.meals.find((item) => item.id === menu.meal_id)!;
  return {
    id: '60000000-0000-4000-8000-000000000001',
    order_number: 'CC-261113-NTF01',
    customer_id: customer.id,
    customer_name: customer.full_name,
    student_id: customer.student_id,
    created_at: '2026-11-13T00:58:00Z',
    pickup_slot_id: data.slots[0].id,
    pickup_at: '2026-11-13T02:00:00Z',
    pickup_code: 'A1B2C3D4',
    status: 'Confirmed',
    total: meal.price,
    payment_collected: false,
    items: [
      {
        meal_id: meal.id,
        daily_menu_id: menu.id,
        name: meal.name,
        quantity: 1,
        unit_price: meal.price,
        category_id: meal.category_id,
      },
    ],
    history: [
      { status: 'Pending', created_at: '2026-11-13T00:58:00Z' },
      { status: 'Confirmed', created_at: '2026-11-13T00:59:00Z' },
    ],
    idempotency_key: 'notifications-fixture-order',
  };
}

test('the notification bell opens an honest empty state and the orders shortcut on a small phone', async ({
  context,
  page,
}) => {
  const { data } = await mockSupabase(context);
  data.orders.push({
    ...sampleOrder(data),
    customer_id: '40000000-0000-4000-8000-000000000099',
    customer_name: 'Another student',
  });
  await page.setViewportSize({ width: 320, height: 640 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date(FIXED_TIME) });
  await signIn(page, 'student');

  await expect(page.getByTestId('notification-unread-badge')).toHaveCount(0);
  await page.getByRole('button', { name: 'View notifications', exact: true }).click();
  await expect(page.getByText('Notifications', { exact: true })).toBeVisible();
  await expect(page.getByText('You’re all caught up', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mark all read', exact: true })).toHaveCount(0);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
  ).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: 'View all orders', exact: true }).click();
  await expect(page).toHaveURL(/\/orders$/);
  await expect(page.getByText('Your orders', { exact: true })).toBeVisible();
  await expect(page.getByText('Notifications', { exact: true })).not.toBeVisible();
});

test('unread updates open their order, persist as read and return for a new status', async ({
  context,
  page,
}) => {
  const { data } = await mockSupabase(context);
  const order = sampleOrder(data);
  data.orders.push(order);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date(FIXED_TIME) });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await signIn(page, 'student');

  const badge = page.getByTestId('notification-unread-badge');
  await expect(badge).toHaveText('2');
  const badgeColor = await badge.evaluate((element) => getComputedStyle(element).backgroundColor);
  const channels = badgeColor.match(/[\d.]+/g)!.map(Number);
  expect(channels[0]).toBeGreaterThan(channels[1] * 1.5);
  expect(channels[0]).toBeGreaterThan(channels[2] * 1.5);
  await page.getByRole('button', { name: 'View notifications', exact: true }).click();
  await expect(page.getByText('2 unread updates', { exact: true })).toBeVisible();
  const confirmed = page.getByRole('button', {
    name: `View notification: Order confirmed, ${order.order_number}`,
    exact: true,
  });
  await expect(confirmed).toBeVisible();
  await page.clock.runFor(350);
  await page.screenshot({ path: 'test-results/notifications-small-phone.png' });
  const notificationBounds = (await confirmed.boundingBox())!;
  expect(notificationBounds.x).toBeGreaterThanOrEqual(0);
  expect(notificationBounds.x + notificationBounds.width).toBeLessThanOrEqual(321);
  await confirmed.click();
  await expect(page).toHaveURL(new RegExp(`/orders\\?id=${order.id}`));
  await expect(page.getByText('Your digital receipt', { exact: true })).toBeVisible();
  await expect(badge).toHaveText('1');
  await expect(page.getByText('Notifications', { exact: true })).not.toBeVisible();
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();

  await page.getByRole('button', { name: 'View notifications', exact: true }).click();
  await expect(page.getByText('1 unread update', { exact: true })).toBeVisible();
  await expect(
    page.getByTestId(`notification-unread-${order.id}:Confirmed:2026-11-13T00:59:00Z`),
  ).toHaveCount(0);
  await expect(
    page.getByTestId(`notification-unread-${order.id}:Pending:2026-11-13T00:58:00Z`),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Mark all read', exact: true }).click();
  await expect(page.getByText('No unread updates', { exact: true })).toBeVisible();
  await expect(badge).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'View notifications', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'View notifications', exact: true }).click();
  await expect(page.getByText('No unread updates', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: /View notification: Order confirmed,/ }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();

  order.status = 'Preparing';
  order.history.push({ status: 'Preparing', created_at: '2026-11-13T01:00:10Z' });
  await page.clock.runFor(21000);
  await expect(badge).toHaveText('1');
  await page.getByRole('button', { name: 'View notifications', exact: true }).click();
  await expect(
    page.getByRole('button', {
      name: `View notification: Your meal is being prepared, ${order.order_number}`,
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText('1 unread update', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('read state stays with each account and staff notifications open the matching order', async ({
  context,
  page,
}) => {
  const { data } = await mockSupabase(context);
  const order = sampleOrder(data);
  data.orders.push(order);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date(FIXED_TIME) });
  await signIn(page, 'student');
  await page.getByRole('button', { name: 'View notifications', exact: true }).click();
  await page.getByRole('button', { name: 'Mark all read', exact: true }).click();
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await signOut(page);
  await signIn(page, 'admin');

  const badge = page.getByTestId('notification-unread-badge');
  await expect(badge).toHaveText('1');
  await page.getByRole('button', { name: 'View notifications', exact: true }).click();
  await expect(
    page.getByRole('button', { name: /View notification: Order confirmed,/ }),
  ).toHaveCount(0);
  await page
    .getByRole('button', {
      name: `View notification: New pre-order, ${order.order_number}`,
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(new RegExp(`/admin/orders\\?id=${order.id}`));
  await expect(page.getByText('Manage order', { exact: true })).toBeVisible();
  await expect(page.getByText('Notifications', { exact: true })).not.toBeVisible();
  await expect(badge).toHaveCount(0);
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await signOut(page);
  await signIn(page, 'student');
  await page.getByRole('button', { name: 'View notifications', exact: true }).click();
  await expect(page.getByText('No unread updates', { exact: true })).toBeVisible();
  await expect(badge).toHaveCount(0);
});

test('pending and failed notification requests never look empty and can be retried', async ({
  context,
  page,
}) => {
  const { data } = await mockSupabase(context);
  data.orders.push(sampleOrder(data));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date(FIXED_TIME) });
  let failOrders = true;
  let releaseOrders!: () => void;
  const pendingOrders = new Promise<void>((resolve) => {
    releaseOrders = resolve;
  });
  await page.route('https://canteen.test/rest/v1/orders**', async (route) => {
    if (route.request().method() !== 'GET' || !failOrders) return route.fallback();
    await pendingOrders;
    await route.fulfill({
      status: 500,
      headers: { 'access-control-allow-origin': '*' },
      json: { message: 'The order service is temporarily unavailable.' },
    });
  });
  await fillLogin(page, 'student');
  await page.getByRole('button', { name: /^Sign in/ }).click();
  await page.getByRole('button', { name: 'View notifications', exact: true }).click();
  await expect(page.getByText('Loading your notifications…', { exact: true })).toBeVisible();
  await expect(page.getByText('You’re all caught up', { exact: true })).toHaveCount(0);
  await expect(page.getByTestId('notification-unread-badge')).toHaveCount(0);

  releaseOrders();
  await expect(page.getByText('Notifications unavailable', { exact: true })).toBeVisible();
  await expect(page.getByText('You’re all caught up', { exact: true })).toHaveCount(0);
  failOrders = false;
  await page.getByRole('button', { name: 'Try again', exact: true }).last().click();
  await expect(page.getByText('2 unread updates', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', {
      name: 'View notification: Order confirmed, CC-261113-NTF01',
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByTestId('notification-unread-badge')).toHaveText('2');
});
