# Application architecture

One Expo SDK 57 / React Native / TypeScript application serves Android, iOS and web. Expo Router owns every route. Student routes use five bottom tabs on small screens; administration uses a separate workspace navigation. The web layout expands into a sidebar, catalog and order bag. React Native components are shared rather than maintaining a separate web application.

## Source map

- `src/app/(student)`: home, menu, cart/checkout, order tracking/receipts and profile.
- `src/app/admin`: dashboard, order queue, menu/scheduling, inventory, reports, accounts and settings.
- `src/app/login.tsx`, `register.tsx`, `forgot-password.tsx`, `reset-password.tsx`: account flows.
- `src/components`: reusable presentation components and forms. React Native Paper provides modal, checkbox, switch, theme and snackbar primitives.
- `src/contexts/app.tsx`: authenticated identity, a single TanStack Query snapshot/subscription, per-account cart and feedback.
- `src/services/supabase.ts`: project configuration and Supabase Auth lifecycle.
- `src/services/session-storage.ts`: chunked native Keychain/Keystore session storage; AsyncStorage on web.
- `src/services/repository.ts`: paginated live queries and server-authorized mutations with no local authentication/data fallback.
- `tests/fixtures/demo-engine.ts`: a test-only reference engine used by unit tests and intercepted HTTP fixtures; it is never imported into the app.
- `scripts/create-admin.mjs`: a terminal-only provisioning command that uses a private server credential and hidden password prompts.
- `src/services/media.ts`: validated image selection/uploads, CSV sharing and foreground pickup notifications.
- `src/utils/domain.ts`: centavo calculations, validation, slot filtering, status transitions and Manila date formatting.
- `supabase/migrations`: authoritative database rules, permissions, transactions, storage and Realtime setup.

## Authoritative order creation

The client sends only daily menu IDs, quantities, a pickup slot ID and a persisted UUID idempotency key. `create_order` locks the active account, serializes requests with the same account/key, locks the pickup slot and inventory rows, checks capacity/schedules/preparation time and obtains current prices from `meals`. It inserts the order, price/name snapshots, history and stock deductions in the same PostgreSQL transaction. A failure rolls back all writes.

The checkout request key survives navigation or a reload. A retry of an already committed request returns the existing order ID. It does not create another order or deduct stock twice. Changing the selected items or pickup time starts a new intent. Clients do not submit totals, pickup codes, payment records or role changes.

## Fulfilment and money

`Pending → Confirmed → Preparing → Ready for Pickup → Completed` is the only forward status path. An administrator may cancel any nonterminal order with a reason. Customers may cancel only their own pending order. Terminal orders cannot change status.

Cancellation restores each reserved serving exactly once and releases the pickup reservation. This initial policy also restores stock for administrator cancellations after preparation; staff should immediately adjust any discarded food in inventory. Collected/completed orders cannot be cancelled. Changing this policy requires changing the server function and matching reference tests.

Completion requires the correct student pickup code and explicit cash collection. One unique `payments` record is inserted in the same transaction as completion. Reports count completed, paid orders and group revenue by **payment collection date**, not order creation date. Order CSV exports use order creation dates; collected-sales exports use collection dates.

## Authorization

Auth user IDs reference `profiles`. Public signup collects a full name, email and password, without a student ID. The app generates a random internal reference for the legacy `student_id` database column, preserving compatibility with existing databases. The reference is not displayed in the app or reports. Signup triggers validate the reference format and create only a `CUSTOMER` role, ignoring role metadata supplied at registration. A trusted operator creates a new staff account with `npm run admin:create`, which still requires a unique staff ID. A service-role-only function checks a one-time nonce in server-controlled Auth metadata before assigning ADMIN, consumes that nonce and audits the operation. Neither a customer nor an administrator signed into the app can invoke it. No role-changing controls exist in either interface. Staff accounts are excluded from the student directory.

Route guards improve the interface; PostgreSQL grants, RLS and security-definer functions enforce access. Customers see only their own profiles/orders/items/history/payments. Staff checks include account suspension. The public aggregate popularity function exposes meal quantities without exposing customer identities. There are no client writes to roles, orders, payments, history or inventory tables.

Absolute inventory edits include the quantity the administrator originally saw. A concurrent checkout causes a stale edit to be rejected instead of overwriting its deduction. Booked slots cannot be moved and capacity cannot be reduced below existing reservations. Administrator changes are audited.

## Synchronization and failure behavior

One Realtime channel invalidates the shared query snapshot for menu, order, stock, slot, profile and settings changes. A 20-second polling fallback and app-resume refresh provide recovery if the channel is interrupted. Paginated reads avoid silently losing records beyond Supabase's 1,000-row default. This full-snapshot approach is suitable for a campus demonstration; larger deployments should move reports and order-list filtering to paginated server queries.

Failed requests show a retryable error or snackbar. Checkout is not queued offline. A failed photo upload cannot overwrite an existing meal photo. Photo file signatures, MIME types and a 5 MB limit are validated before upload; the storage bucket enforces MIME/size and admin-only writes. Sample photos are bundled and can display without external image requests.

The shared login has no role chooser, preset credentials, demo bypass or automatic sample session. Missing configuration keeps private routes locked. Test account identities and mocked HTTP responses live exclusively in the test runner, outside the application bundle. A separate `dist-e2e/` export is used for browser tests. Server credentials stay in the terminal process, and a build guard rejects them in public environment variables. Web prerendering never initializes browser session storage.

## Notifications

Students see an in-app ready banner and live tracker. When device permission has been explicitly enabled, the active app schedules a local notification on a newly received Ready for Pickup status. This version does not send server-originated push notifications while the app is closed. That requires push-token registration, a server worker/Edge Function and a development build.
