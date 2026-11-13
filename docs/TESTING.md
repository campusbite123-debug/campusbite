# Validation and demonstration

## Automated tests

```powershell
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
```

The browser command creates a separate production export using a fake public Supabase URL/key, starts a test-only preview on port 8082, intercepts HTTP calls and stops that preview afterward. It does not create a real administrator or connect to a real project. Keep port 8082 available. The normal app/export has no fixture accounts or authentication bypass.

In this workspace, set `$env:PLAYWRIGHT_BROWSERS_PATH = 'D:\Campus Canteen System\.browser-cache'` to use the installed browser cache.

Coverage:

- Shared email/password login, blank credentials, masked password and no role chooser/admin hints.
- Signup without a student ID, a generated internal account reference, and a profile without student ID fields.
- Desktop and mobile order confirmation with pickup code, time/location, itemized receipt and a working Track my order action.
- Order loading with a null payment before pickup and a payment object after cash collection; browser fixtures match the database's one-to-one payment relation.
- Wrong password rejection, signed-out route protection, old demo-session rejection and student/admin routing through the same form.
- Student checkout → administrator preparation → wrong-code rejection → paid pickup/revenue.
- Mobile navigation, search, details, cart and student restrictions on admin routes.
- Administrator meal/stock changes appearing in the student menu.
- Stale daily-menu edits rejected after another student reserves a meal.
- Real PostgreSQL migrations/RLS, stock/idempotency, transitions, pickup/payment, cancellation, CSV safety, secure native-storage adapter and provisioning rollback.
- Terminal-only role assignment, one-time server-controlled nonce consumption, administrator exclusion from the student directory and public-secret build guards.

`tests/fixtures/demo-engine.ts` is a test-only reference engine for the HTTP fixture. It is not imported into `src/`. The SQL suite executes all five migrations and the seed in PGlite with stand-ins for Supabase Auth/Storage schemas. PGlite's one backend session cannot prove lock contention across independent connections. Supabase HTTP authentication, email, hosted Storage/Realtime and physical devices still require a live project.

## Live demonstration setup

1. Apply all migrations, including `202611130005_terminal_admin.sql`, and run the seed.
2. Configure public `.env` values and private terminal `.env.admin.local` values as described in README.
3. Run `npm run admin:create` in the terminal to provision a staff account. No staff credentials should appear in the app UI or be included in presentation slides.
4. Create two student accounts through public registration and confirm their emails.
5. Open separate browser profiles/devices for each user. All users sign in at `/login`; there is no role switch.

## Manual acceptance checks

Authentication and access:

- [ ] A fresh browser opens Login. Both email and password are empty; no account type selector or administrator credential hint exists.
- [ ] Correct student credentials open Home; correct terminal-provisioned staff credentials open Dashboard using that same form.
- [ ] Wrong passwords do not open a workspace. Logout and expired sessions lock private routes.
- [ ] A customer navigating to `/admin` returns to Home; a signed-out user returns to Login.
- [ ] Signup requires only a full name, email, password and confirmation. Student ID is absent from signup, profile, account/order displays and CSV reports. Invalid names/emails and mismatched passwords show errors. Every public signup has CUSTOMER role even if submitted metadata requests ADMIN.
- [ ] Registration and recovery email links work with allowed redirects. Session persistence works after relaunch.
- [ ] Student/admin application sessions cannot call `terminal_provision_admin`, write roles directly, or create administrators through any UI.
- [ ] Staff accounts do not appear in Students. Customers cannot read another user's profile, orders, items or payments.
- [ ] Suspensions require a reason and resolved active orders. Suspended accounts cannot place orders.

Ordering and stock:

- [ ] Place Chicken Adobo with Rice (₱75) plus House Iced Tea (₱25), choose a valid future pickup, and confirm a ₱100 receipt/code.
- [ ] Sign in as staff separately; confirm, prepare and ready that order. The student's tracker receives the change.
- [ ] Wrong pickup code or missing cash confirmation fails. Correct code plus cash completes pickup and records exactly one ₱100 payment.
- [ ] Pending, cancelled and uncollected orders contribute zero revenue. Verify date/category/quantity totals and CSV exports.
- [ ] Two independent student devices compete for one serving: exactly one succeeds and stock ends at zero.
- [ ] Duplicate checkout UUIDs return the same order without another deduction. Retry after a lost response recovers the receipt.
- [ ] If any order line is invalid, every deduction/order insert rolls back.
- [ ] Past/full slots, archived/sold-out meals, insufficient preparation time and mismatched service windows are rejected.
- [ ] Paused ordering blocks checkout even from a stale client.
- [ ] Leave a stock/daily-menu editor open while another student orders; saving the stale count must fail.
- [ ] Cancellation restores stock once and releases pickup capacity. Repeated cancellation and invalid status changes fail.
- [ ] Booked pickup times cannot move or lose reserved capacity; closing a slot to new orders works.

Operations:

- [ ] Edit/schedule a meal and confirm the student menu updates. Test breakfast/lunch windows and future dates.
- [ ] Upload a valid meal image. Disguised/oversized images and student uploads must fail.
- [ ] Disconnect during checkout: show a meaningful error without reporting unconfirmed success. Reconnect and retry.
- [ ] Test Android/iOS safe areas, keyboards, modal scrolling, image selection and CSV sharing.
- [ ] Enable/deny local notification permission and check a ready update during an active app session. Remote push while closed is outside this version's scope.

## Terminal provisioning checks

- [ ] `npm run admin:create` prompts for password/confirmation without echoing them and never prints them afterward.
- [ ] A publishable key is rejected for provisioning. An admin/student JWT cannot invoke the privileged RPC.
- [ ] Existing emails are not promoted or overwritten. Short passwords and duplicate staff IDs fail.
- [ ] Missing migrations/provisioning failure leaves no usable accidental account; an uncertain new account is disabled.
- [ ] `.env.admin.local` is ignored by git. No server credential exists in public environment variables or exported client bundles.

No real project credentials or physical devices were supplied during this implementation. Complete this live checklist before using the app with actual students.
