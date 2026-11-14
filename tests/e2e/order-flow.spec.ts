import { test, expect } from '@playwright/test';
import { mockSupabase, signIn, signOut, FIXED_TIME } from './helpers/supabase';
let api: Awaited<ReturnType<typeof mockSupabase>>;
test.beforeEach(async ({ context }) => {
  api = await mockSupabase(context);
});

test('student signup and profile no longer request or display a student ID', async ({ page }) => {
  await page.route('https://canteen.test/auth/v1/signup**', (route) =>
    route.fulfill({
      status: 200,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': '*',
        'access-control-allow-methods': 'POST,OPTIONS',
      },
      json: {
        id: '40000000-0000-4000-8000-000000000099',
        email: 'new-student@school.test',
        aud: 'authenticated',
        role: 'authenticated',
        created_at: FIXED_TIME,
        user_metadata: { full_name: 'New Student' },
        identities: [],
      },
    }),
  );
  await page.goto('/register');
  await expect(page.getByText('Join the table.', { exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Student ID', exact: true })).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Full name', exact: true }).fill('New Student');
  await page
    .getByRole('textbox', { name: 'Campus email', exact: true })
    .fill('new-student@school.test');
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('new-student-password');
  await page
    .getByRole('textbox', { name: 'Confirm password', exact: true })
    .fill('new-student-password');
  const signup = page.waitForRequest(
    (request) => request.url().includes('/auth/v1/signup') && request.method() === 'POST',
  );
  await page.getByRole('button', { name: /^Create student account/ }).click();
  const signupRequest = await signup;
  expect(new URL(signupRequest.url()).searchParams.has('redirect_to')).toBe(false);
  const submitted = signupRequest.postDataJSON();
  expect(submitted.data.full_name).toBe('New Student');
  // Preserve compatibility with the existing SQL constraint without asking students for an ID.
  expect(submitted.data.student_id).toMatch(/^[A-F0-9]{30}$/);
  expect(submitted.data).not.toHaveProperty('role');
  await expect(page).toHaveURL(/\/login/);
  await expect(
    page.getByText('Check your email to confirm your account, then sign in.'),
  ).toBeVisible();
  await signIn(page, 'student');
  await page.getByRole('link', { name: 'Profile', exact: true }).click();
  await expect(page.getByText('A little about you.', { exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Student ID', exact: true })).toHaveCount(0);
  await expect(page.getByText('2026-00142', { exact: true })).toHaveCount(0);
});
test('student pre-order → admin kitchen → verified pickup and revenue', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-13T01:00:00Z') });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await signIn(page, 'student');
  await expect(page.getByText('What are you craving today?')).toBeVisible();
  await page.waitForFunction(() =>
    Array.from(document.images).some((i) => i.complete && i.naturalWidth > 0),
  );
  await page.screenshot({ path: 'test-results/student-home-desktop.png', fullPage: true });
  await page
    .getByRole('button', { name: 'Add Chicken Adobo with Rice to bag', exact: true })
    .click();
  await expect(page.getByText('Added to your bag', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/bag-toast-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Dismiss notification', exact: true }).click();
  await expect(page.getByText('Added to your bag', { exact: true })).not.toBeVisible();
  await page.getByRole('button', { name: 'Add House Iced Tea to bag', exact: true }).click();
  await page.getByRole('link', { name: /Cart/ }).click();
  await expect(page.getByText('Total to pay at pickup')).toBeVisible();
  await page.getByRole('button', { name: '9:30 AM', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm pre-order', exact: true }).click();
  await expect(page.getByText('Your pre-order is in!', { exact: true })).toBeVisible();
  await expect(page.getByText('Added to your bag', { exact: true })).not.toBeVisible();
  const code = (await page.getByText(/^[A-F0-9]{8}$/).textContent())!.trim();
  const orderNumber = (await page.getByText(/^CC-/).last().textContent())!.trim();
  await expect(page.getByText('Payment due at pickup', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Track my order', exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/order-confirmation-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Track my order', exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/order-confirmation-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Track my order', exact: true }).click();
  await expect(page.getByText('Your digital receipt', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await signOut(page);
  await signIn(page, 'admin');
  await expect(page.getByText('A good day starts here.')).toBeVisible();
  await page.getByRole('button', { name: 'Manage orders', exact: true }).click();
  await page.getByText(orderNumber, { exact: true }).click();
  await page.getByRole('button', { name: 'Confirm order', exact: true }).click();
  await page.getByRole('button', { name: 'Start preparing', exact: true }).click();
  await page.getByRole('button', { name: 'Mark ready for pickup', exact: true }).click();
  await page.getByRole('textbox', { name: 'Student’s pickup code', exact: true }).fill('WRONG');
  await page.getByRole('checkbox', { name: 'I have collected the cash payment' }).click();
  await page.getByRole('button', { name: 'Verify code & complete pickup', exact: true }).click();
  await expect(page.getByText('Verify the pickup code and confirm cash collection.')).toBeVisible();
  await page.getByRole('textbox', { name: 'Student’s pickup code', exact: true }).fill(code);
  await page.getByRole('button', { name: 'Verify code & complete pickup', exact: true }).click();
  await expect(page.getByText('Cash collected', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.getByRole('link', { name: 'Analytics', exact: true }).click();
  await expect(page.getByText('Collected revenue', { exact: true })).toBeVisible();
  await expect(page.getByText('₱100', { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: 'test-results/admin-analytics-desktop.png', fullPage: true });
  expect(errors).toEqual([]);
});
test('mobile navigation, filtering, details and route protection', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date('2026-11-13T01:00:00Z') });
  await signIn(page, 'student');
  await expect(page.getByText('What are you craving today?')).toBeVisible();
  await page.waitForFunction(() =>
    Array.from(document.images).some((i) => i.complete && i.naturalWidth > 0),
  );
  await page.screenshot({ path: 'test-results/student-home-mobile.png', fullPage: true });
  await page.getByRole('tab', { name: 'Menu', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Search for your next favorite meal…', exact: true })
    .fill('Pancit');
  await expect(page.getByText('1 delicious reasons to take a break')).toBeVisible();
  await page.getByRole('button', { name: 'View Pancit Canton', exact: true }).click();
  await expect(page.getByText('A closer look')).toBeVisible();
  await page.getByRole('button', { name: /Add to bag ·/ }).click();
  await expect(page.getByText('Added to your bag', { exact: true })).toBeVisible();
  await expect(page.getByText('A closer look', { exact: true })).not.toBeVisible();
  await page.screenshot({ path: 'test-results/bag-toast-mobile.png', fullPage: true });
  await page.clock.fastForward(4600);
  await expect(page.getByText('Added to your bag', { exact: true })).not.toBeVisible();
  await page.getByRole('button', { name: 'View Pancit Canton', exact: true }).click();
  await page.getByRole('button', { name: /Add to bag ·/ }).click();
  await expect(page.getByText('Added to your bag', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'View bag', exact: true }).click();
  await expect(page.getByText('Added to your bag', { exact: true })).not.toBeVisible();
  await expect(page.getByText('Your bag, your break.')).toBeVisible();
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/home/);
});

test('administrator meal and inventory changes reach the student menu', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-13T01:00:00Z') });
  await signIn(page, 'student');
  await signOut(page);
  await signIn(page, 'admin');
  await page.getByRole('link', { name: 'Menu management', exact: true }).click();
  await page.getByRole('button', { name: 'Edit Chicken Adobo with Rice' }).click();
  await page.getByRole('textbox', { name: 'Price (PHP)', exact: true }).fill('80');
  await page.getByRole('button', { name: 'Save meal', exact: true }).click();
  await expect(page.getByText('₱80', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Inventory', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search your meal inventory' }).fill('Adobo');
  await page.getByRole('button', { name: 'Update stock', exact: true }).click();
  await page.getByRole('textbox', { name: 'Remaining servings', exact: true }).fill('5');
  await page.getByRole('button', { name: 'Save stock', exact: true }).click();
  await expect(page.getByText('Inventory updated.', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/admin-inventory-desktop.png' });
  await signOut(page);
  await signIn(page, 'student');
  await expect(page.getByText('5 left today', { exact: true })).toBeVisible();
  await expect(page.getByText('₱80', { exact: true })).toBeVisible();
});

test('an open daily-menu editor cannot overwrite a new student reservation', async ({
  page,
  browser,
}) => {
  await page.clock.install({ time: new Date(FIXED_TIME) });
  await signIn(page, 'admin');
  const otherContext = await browser.newContext();
  await api.attach(otherContext);
  try {
    const student = await otherContext.newPage();
    await student.clock.install({ time: new Date(FIXED_TIME) });
    await signIn(student, 'student');
    await page.getByRole('link', { name: 'Menu management', exact: true }).click();
    await page.getByRole('textbox', { name: 'Search meals or descriptions' }).fill('Adobo');
    await page.getByRole('button', { name: 'Schedule', exact: true }).click();
    await expect(
      page.getByRole('textbox', { name: 'Remaining quantity', exact: true }),
    ).toHaveValue('28');
    await student
      .getByRole('button', { name: 'Add Chicken Adobo with Rice to bag', exact: true })
      .click();
    await student.getByRole('link', { name: 'Cart', exact: true }).click();
    await student.getByRole('button', { name: '9:30 AM', exact: true }).click();
    await student.getByRole('button', { name: 'Confirm pre-order', exact: true }).click();
    await expect(student.getByText('Your pre-order is in!', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Save daily menu', exact: true }).click();
    await expect(
      page.getByText('Stock changed while you were editing. Refresh and try again.', {
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
    await page.getByRole('link', { name: 'Inventory', exact: true }).click();
    await page.getByRole('textbox', { name: 'Search your meal inventory' }).fill('Adobo');
    await expect(page.getByText('27', { exact: true })).toBeVisible();
  } finally {
    await otherContext.close();
  }
});

test('one login form has no role chooser, preset credentials or legacy demo bypass', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'canteen-demo-session',
      JSON.stringify({ id: 'demo-admin', role: 'ADMIN' }),
    ),
  );
  await page.goto('/');
  await expect(page.getByTestId('welcome-screen')).toBeVisible();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('textbox', { name: 'Campus email', exact: true })).toHaveValue('');
  await expect(page.getByRole('textbox', { name: 'Password', exact: true })).toHaveValue('');
  await expect(page.getByRole('textbox', { name: 'Password', exact: true })).toHaveAttribute(
    'type',
    'password',
  );
  await expect(page.getByRole('combobox')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /admin|demo|switch/i })).toHaveCount(0);
  await page.screenshot({ path: 'test-results/shared-login-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/shared-login-mobile.png' });
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login/);
  await page
    .getByRole('textbox', { name: 'Campus email', exact: true })
    .fill('student@school.test');
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('incorrect-password');
  await page.getByRole('button', { name: /^Sign in/ }).click();
  await expect(page.getByText('Invalid login credentials', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
