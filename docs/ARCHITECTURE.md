# Application architecture

One Expo SDK 57 / React Native / TypeScript application serves Android, iOS and web. Expo Router owns every route. Narrow windows use five tabs in a floating, rounded bottom bar. The current route's tab becomes the raised orange circle; the tabs keep equal, fixed positions. Selection follows navigation, direct links, reloads and browser history. A short lift animation respects reduced-motion settings. The bar keeps the app's orange and cream palette. Administrator navigation includes Dashboard, Inventory, Orders, Analytics and More, with the remaining pages and sign out in More. The dock reserves space for the raised circle and device safe area, keeping page and checkout controls above it. Tablets use an 88px navigation rail from 768px; desktops use the full 224px sidebar from 1200px. React Native components are shared rather than maintaining a separate web application.

## Source map

- `src/app/(student)`: home, menu, cart/checkout, order tracking/receipts and profile.
- `src/app/admin`: dashboard, order queue, menu/scheduling, inventory, reports, accounts and settings.
- `src/app/index.tsx`: food-photo welcome screen for signed-out visitors; saved sessions and recovery links route directly to their authorized destination.
- `src/app/login.tsx`, `register.tsx`, `forgot-password.tsx`, `reset-password.tsx`: account flows.
- `src/components`: reusable presentation components and forms. React Native Paper provides modal, checkbox, switch and theme primitives; the app supplies its own accessible toast cards.
- `src/hooks/use-layout.ts`: shared navigation, spacing and available-content measurements.
- `src/contexts/app.tsx`: authenticated identity, a single TanStack Query snapshot/subscription, per-account cart and feedback.
- `src/services/supabase.ts`: project configuration and Supabase Auth lifecycle.
- `src/services/session-storage.ts`: chunked native Keychain/Keystore session storage; AsyncStorage on web.
- `src/services/repository.ts`: paginated live queries and server-authorized mutations with no local authentication/data fallback.
- `tests/fixtures/demo-engine.ts`: a test-only reference engine used by unit tests and intercepted HTTP fixtures; it is never imported into the app.
- `scripts/create-admin.mjs`: a terminal-only provisioning command that uses a private server credential and hidden password prompts.
- `src/services/media.ts`: validated image selection/uploads, CSV sharing and foreground pickup notifications.
- `src/utils/domain.ts`: centavo calculations, validation, slot filtering, status transitions and Manila date formatting.
- `supabase/migrations`: authoritative database rules, permissions, transactions, storage and Realtime setup.

## Responsive layout and rendering

Typography uses bundled Plus Jakarta Sans Bold for headings and Inter in four weights for readable interface text and tabular prices/codes. The same family mapping is applied to React Native Paper components. Only the five required weights are imported; font license notices are kept under `assets/fonts`.

Authentication screens share a food photograph and curved cream form panel. Phones stack the photo above the form; tablets center a rounded card; wider screens place the food story beside the form over a soft photographic backdrop. The decorative image and its generation prompt are bundled under `assets/auth`. Account fields retain their labels, autofill and validation, with visible focus borders and password visibility controls. Header back buttons return login to the welcome screen and signup/recovery to sign-in, including direct-entry URLs.

Catalog columns use the measured grid width, accounting for navigation, page padding and the optional desktop bag panel. Controls have 44px minimum touch targets. Phone checkout keeps its action above the bottom tabs; meal dialogs use a bottom sheet with a fixed quantity/action footer. Forms scroll around the keyboard and respect safe areas. Tablet rotation and split-screen keep the same cart state.

Meal cards use inset photos, category labels, preparation-time chips and a separate price/Add footer. Wider cards include a short description; narrow cards keep the full details in the meal sheet. A photo badge shows the quantity already in the bag. Add is disabled for sold-out stock, paused ordering, unavailable pickups or the existing stock/99-item bag limit; server checkout still validates availability.

The home banner cycles through up to four active featured meals every 6.5 seconds, using short opacity/translation transitions and a stable height. The centered dots allow manual selection while automatic rotation continues and loops to the first slide. There is no slide counter or playback button. Rotation stops when the route loses focus, the app is in the background, or reduced motion is enabled. The menu action stays in one fixed position while the headline and real meal photo change. If there are no featured meals, it uses active meals or a static kitchen illustration.

Meal lookup/popularity indexes, filtered results and pickup availability are memoized; search uses a deferred value so input stays responsive. Availability is refreshed on each snapshot fetch, including when unchanged data is structurally shared. Server checkout remains the final authority for time, price and stock. Expo Image caches photos in memory and on disk, and downscales them for their displayed size.

Only the latest overlapping Auth profile lookup can finish initial session loading. This prevents deep links from briefly redirecting through login on a reload. The initial loading tree stays identical during static rendering and browser hydration.

Explicit sign-in and sign-out requests show a shared modal loading screen, dismiss the keyboard and prevent repeated submissions. Sign-in keeps that screen visible through profile/role lookup; sign-out covers every navigation entry point. Both release the screen on failure so the existing form or workspace can show the error and allow a retry.

The shared loading skeleton uses menu, list and workspace layouts with a single opacity animation. It uses the native animation driver on devices, pauses in the background, respects reduced-motion changes and cleans up on unmount. Decorative placeholders contain no text or font dependencies, and one accessible progress indicator describes the busy state.

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
