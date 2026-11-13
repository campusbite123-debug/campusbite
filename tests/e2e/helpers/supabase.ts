import { expect, type BrowserContext, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { createSeed, DemoEngine, DEMO_ADMIN, DEMO_CUSTOMER } from '../../fixtures/demo-engine';
import type { SessionUser } from '@/types';
export const FIXED_TIME = '2026-11-13T01:00:00Z';
const accounts = {
  student: {
    ...DEMO_CUSTOMER,
    id: '40000000-0000-4000-8000-000000000001',
    email: 'student@school.test',
    password: 'Student-test-password-123!',
  },
  admin: {
    ...DEMO_ADMIN,
    id: '40000000-0000-4000-8000-000000000002',
    email: 'staff@school.test',
    password: 'Staff-test-password-123!',
  },
};
// Network fixtures are owned by the test runner. None of these accounts or responses
// are imported by, embedded in, or selectable from the application.
export async function mockSupabase(context: BrowserContext) {
  const data = createSeed();
  const delta =
    Date.parse('2026-11-13T00:00:00+08:00') -
    Date.parse(`${data.menus[0].service_date}T00:00:00+08:00`);
  data.menus.forEach((m) => {
    m.service_date = new Date(Date.parse(`${m.service_date}T12:00:00Z`) + delta)
      .toISOString()
      .slice(0, 10);
  });
  data.slots.forEach((s) => {
    s.starts_at = new Date(Date.parse(s.starts_at) + delta).toISOString();
    s.ends_at = new Date(Date.parse(s.ends_at) + delta).toISOString();
  });
  data.profiles = Object.values(accounts).map(({ password: _password, ...profile }) => profile);
  const engine = new DemoEngine(data, randomUUID, () => Date.parse(FIXED_TIME));
  function token(user: SessionUser) {
    return `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: user.id, role: 'authenticated', exp: Date.parse(FIXED_TIME) / 1000 + 86400, iss: 'https://canteen.test/auth/v1' })).toString('base64url')}.test-signature`;
  }
  function authUser(user: SessionUser) {
    return {
      id: user.id,
      email: user.email,
      aud: 'authenticated',
      role: 'authenticated',
      created_at: FIXED_TIME,
      email_confirmed_at: FIXED_TIME,
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { full_name: user.full_name, student_id: user.student_id },
      identities: [],
    };
  }
  async function attach(target: BrowserContext) {
    await target.route('https://canteen.test/**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const method = request.method();
      const body = request.postDataJSON() ?? {};
      const send = (value: unknown, status = 200) =>
        route.fulfill({
          status,
          json: value,
          headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-headers': '*',
            'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
          },
        });
      if (method === 'OPTIONS')
        return route.fulfill({
          status: 204,
          headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-headers': '*',
            'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
          },
        });
      let user: SessionUser | undefined;
      try {
        const sub = JSON.parse(
          Buffer.from(
            (request.headers().authorization ?? '').split('.')[1],
            'base64url',
          ).toString(),
        ).sub;
        user = Object.values(accounts).find((a) => a.id === sub);
      } catch {}
      if (url.pathname === '/auth/v1/token') {
        const match = Object.values(accounts).find(
          (a) => a.email === body.email && a.password === body.password,
        );
        if (!match)
          return send({ code: 'invalid_credentials', msg: 'Invalid login credentials' }, 400);
        return send({
          access_token: token(match),
          token_type: 'bearer',
          expires_in: 86400,
          refresh_token: `refresh-${match.id}`,
          user: authUser(match),
        });
      }
      if (url.pathname === '/auth/v1/logout') return send({});
      if (url.pathname === '/auth/v1/user')
        return user ? send(authUser(user)) : send({ message: 'Unauthorized' }, 401);
      if (!user) return send({ message: 'Unauthorized' }, 401);
      const active = user;
      const ownOrders = () =>
        active.role === 'ADMIN'
          ? data.orders
          : data.orders.filter((o) => o.customer_id === active.id);
      try {
        if (url.pathname.startsWith('/rest/v1/rpc/')) {
          const name = url.pathname.split('/').pop();
          if (name === 'get_pickup_slots') return send(data.slots);
          if (name === 'list_students') {
            engine.admin(active);
            return send(data.profiles.filter((p) => p.id !== accounts.admin.id));
          }
          if (name === 'get_meal_popularity') {
            const totals = new Map<string, number>();
            data.orders
              .filter((o) => o.status !== 'Cancelled')
              .forEach((o) =>
                o.items.forEach((i) =>
                  totals.set(i.meal_id, (totals.get(i.meal_id) ?? 0) + i.quantity),
                ),
              );
            return send([...totals].map(([meal_id, quantity]) => ({ meal_id, quantity })));
          }
          if (name === 'create_order')
            return send(
              engine.checkout(
                {
                  items: body.p_items,
                  slot_id: body.p_slot_id,
                  idempotency_key: body.p_idempotency_key,
                },
                active,
              ).id,
            );
          if (name === 'transition_order') {
            engine.transition(
              body.p_order_id,
              body.p_status,
              active,
              body.p_pickup_code,
              body.p_reason,
              body.p_collect_cash,
            );
            return send(null);
          }
          if (name === 'set_stock') {
            const menu = data.menus.find((m) => m.id === body.p_menu_id);
            if (menu?.quantity !== body.p_expected_quantity)
              throw new Error('Stock changed while you were editing. Refresh and try again.');
            engine.stock(body.p_menu_id, body.p_quantity, body.p_threshold, active);
            return send(null);
          }
          if (name === 'schedule_meal') {
            const existing = data.menus.find(
              (m) => m.meal_id === body.p_meal_id && m.service_date === body.p_service_date,
            );
            if (existing && existing.quantity !== body.p_expected_quantity)
              throw new Error('Stock changed while you were editing. Refresh and try again.');
            engine.schedule(
              {
                meal_id: body.p_meal_id,
                service_date: body.p_service_date,
                available_from: body.p_available_from,
                available_until: body.p_available_until,
                is_available: body.p_available,
                quantity: body.p_quantity,
                low_stock_threshold: body.p_threshold,
              },
              active,
            );
            return send(existing?.id ?? 'scheduled');
          }
          return send({ message: 'Permission denied' }, 403);
        }
        const table = url.pathname.split('/').pop();
        const id = url.searchParams.get('id')?.replace(/^eq\./, '');
        const single = request.headers().accept?.includes('application/vnd.pgrst.object');
        let rows: any[] = [];
        switch (table) {
          case 'profiles':
            rows = data.profiles.filter((p) => p.id === active.id);
            if (id) rows = rows.filter((p) => p.id === id);
            break;
          case 'user_roles':
            rows = [{ user_id: active.id, role: active.role }];
            break;
          case 'meal_categories':
            rows = data.categories;
            break;
          case 'meals':
            if (method === 'PATCH') {
              engine.admin(active);
              const meal = data.meals.find((m) => m.id === id);
              if (meal) Object.assign(meal, body);
            }
            rows = id ? data.meals.filter((m) => m.id === id) : data.meals;
            break;
          case 'daily_menus':
            rows = data.menus;
            break;
          case 'meal_inventory':
            rows = data.menus.map((m) => ({
              daily_menu_id: m.id,
              quantity: m.quantity,
              low_stock_threshold: m.low_stock_threshold,
            }));
            break;
          case 'canteen_settings':
            rows = [data.settings];
            break;
          case 'orders':
            rows = ownOrders().map((o) => ({
              ...o,
              order_items: o.items,
              order_status_history: o.history,
              payments: o.payment_collected
                ? { amount: o.total, collected_at: o.collected_at }
                : null,
            }));
            break;
          default:
            return send({ message: 'Unknown fixture request' }, 404);
        }
        return send(single ? (rows[0] ?? null) : rows);
      } catch (error) {
        return send({ message: (error as Error).message, code: 'P0001' }, 400);
      }
    });
  }
  await attach(context);
  return { attach, data };
}
export async function signIn(page: Page, role: 'student' | 'admin') {
  await page.goto('/login');
  await expect(page.getByText('Welcome back.', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Campus email', exact: true }).fill(accounts[role].email);
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill(accounts[role].password);
  await page.getByRole('button', { name: /^Sign in/ }).click();
  await expect(
    page.getByText(role === 'admin' ? 'A good day starts here.' : 'What are you craving today?', {
      exact: true,
    }),
  ).toBeVisible();
}
export async function signOut(page: Page) {
  const desktop = page.viewportSize()!.width >= 1000;
  if (desktop) await page.getByText('Sign out', { exact: true }).click();
  else {
    await page.getByRole('tab', { name: 'Profile', exact: true }).click();
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  }
  await expect(page).toHaveURL(/\/login/);
}
