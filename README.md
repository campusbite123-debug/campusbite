# Campusbite · Campus Canteen Pre-Order & Digital Menu System

One Expo SDK 57 / React Native / TypeScript application with **one shared login** and separate student and administrator workspaces. Prices are Philippine pesos stored as integer centavos; pickup schedules use Asia/Manila.

## Run locally

Use Node.js 22.14+ and npm:

```powershell
cd "D:\Campus Canteen System\campus-canteen"
npm install
npm run web
```

Open http://localhost:8081. Signed-out visitors see a food-themed welcome screen with Sign in and Create an account actions. Sign in opens the single email-and-password form. It has no preset credentials, role selectors, administrator signup controls, demo entry or automatic demo sessions. A valid persisted Supabase session may reopen its authorized workspace.

Without Supabase configuration, the welcome and login pages remain accessible and private routes remain locked. The former `EXPO_PUBLIC_DEMO_MODE` setting and old demo sessions no longer grant access.

For a phone, run `npm start` and scan the Expo QR code on the same network. SDK 57 targets a compatible Expo Go version; see [Expo's setup guide](https://docs.expo.dev/get-started/create-a-project/). Use a development build if your installed Expo Go does not support it. To preview a production web export, run `npm run build:web`, then `npm run preview:web`. Stop another server using port 8081 first.

The workspace `.npmrc` puts npm's cache on the project drive because the system drive filled during initial setup. Remove that file on another machine if you prefer the normal npm cache.

## Connect Supabase

1. Create a Supabase project. Apply all migration files in chronological order:
   - `supabase/migrations/202611130001_canteen.sql`
   - `supabase/migrations/202611130002_storage_realtime.sql`
   - `supabase/migrations/202611130003_admin_consistency.sql`
   - `supabase/migrations/202611130004_popular_meals.sql`
   - `supabase/migrations/202611130005_terminal_admin.sql`
2. Run `supabase/seed.sql` for editable sample meals, categories, inventory and seven days of pickup slots. It creates **no accounts**. Rerunning adds missing dates without resetting stock or orders.
3. Copy `.env.example` to `.env`. Set `EXPO_PUBLIC_SUPABASE_URL` to your project URL and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to its public publishable or legacy anon key.
4. Enable email/password authentication, email confirmation and SMTP. Allow the actual redirect addresses: `http://localhost:8081/**`, `campuscanteen://**`, and your Expo Go LAN address such as `exp://YOUR_LAN_IP:8081/--/**`. Browser password recovery uses PKCE, so open the email on the originating device/browser.
5. Check the `meal-images` public bucket, 5 MB/MIME restrictions and Realtime publication created by migration 002. Restart Expo after environment changes.

No hosted project credentials were supplied during development. Hosted authentication, email, Storage, Realtime and account provisioning need verification on your configured project.

## Create an administrator in the terminal

Public signup asks for a full name, email, password and password confirmation, and always creates a **CUSTOMER**. No student ID is required. Staff and students use the **same login page**; the database role determines the workspace. Administrator details are not advertised in that page or in the student directory.

After applying migration 005:

```powershell
Copy-Item .env.admin.example .env.admin.local
```

Edit the ignored `.env.admin.local` file locally. Set `SUPABASE_URL` and `SUPABASE_SECRET_KEY` to the project URL and private server credential. A legacy `SUPABASE_SERVICE_ROLE_KEY` is accepted instead. Never put a server credential in an `EXPO_PUBLIC_*` variable, `.env`, app source or a screenshot. Normal npm start/export commands reject server credentials in public variables.

Run:

```powershell
npm run admin:create
```

The terminal asks for full name, email, unique staff ID and a password of at least 12 characters. Password entry and confirmation are hidden. No credentials are printed; passwords cannot be passed as command-line arguments. `node scripts/create-admin.mjs --help` prints usage.

The command creates a **new** Auth account and confirms its email. A service-role-only database operation checks a one-time nonce in server-controlled Auth metadata, assigns ADMIN, consumes the nonce and records the creation event. Signed-in students and administrators cannot invoke that operation. No role-changing controls exist in the app.

Existing accounts are never promoted by this command. Do not register the staff email through public signup first. Resolve any existing conflicting account as project owner. A failed fresh creation is rolled back when its state is known; an uncertain new account is disabled rather than silently left usable. Staff who forget a password use the shared password recovery page.

The terminal file is git-ignored and is not loaded by Expo. Restrict it and the server credential to trusted operators. PostgreSQL project owners inherently retain database-level authority; the application does not expose it.

## Features and rules

Students can register, sign in, search/filter/sort scheduled meals, inspect stock/preparation time, keep a cart, choose pickup slots, pre-order with cash on pickup, track status and present a digital receipt/code. RLS restricts private records to their owners.

Administrators manage meal photos/prices, daily/future menus, inventory/low-stock thresholds, orders, pickup codes/cash, reports/CSV, student accounts and operating hours/pickup slots. Staff accounts are excluded from the student directory.

The server calculates totals and reserves stock atomically. Persisted UUID checkout keys protect retries. Statuses advance Pending → Confirmed → Preparing → Ready for Pickup → Completed. Customers can cancel their own pending order; staff can cancel nonterminal orders with a reason. Cancellation restores stock once. Revenue is counted only after verified pickup and cash collection.

Realtime has a 20-second polling fallback. Stock and daily-menu editors reject stale counts; booked pickup times cannot move and capacity cannot drop below reservations. Checkout requires internet and is not queued offline.

## Tests

```powershell
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
npx expo-doctor
```

The browser command builds a separate `dist-e2e/` export and starts port 8082. The **test runner** intercepts Supabase HTTP responses; the application exercises its normal shared login/Supabase client. Fixture accounts are never imported into the normal app. Its preview server stops afterward and `dist/` stays separate.

For this workspace's existing Chromium cache, first set `$env:PLAYWRIGHT_BROWSERS_PATH = 'D:\Campus Canteen System\.browser-cache'`.

The database suite executes all migrations/RLS in PGlite PostgreSQL. The tests also cover terminal provisioning permissions, nonce consumption, hidden staff records, rollback and public-secret guards. PGlite has one backend session; independent-connection contention, hosted services and physical devices need live acceptance testing. See [docs/TESTING.md](./docs/TESTING.md).

## Native builds

`npm run android` opens a configured Android emulator. The iOS simulator requires macOS. If a development build is needed, install `expo-dev-client` with `npx expo install expo-dev-client`, then use the included `eas.json` development profile with EAS CLI. Supply the public Supabase environment values to the selected build environment. No EAS submission or physical-device test was performed during development.

The active app shows ready banners/live tracking. Students can enable a local device notification for a received ready update. Remote push delivery while the app is closed is not implemented.

Read [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the module map and transaction rules. Photo attribution is accessible from Profile and [assets/meals/CREDITS.md](./assets/meals/CREDITS.md). All meal images are editable. The full administration snapshot is suitable for a campus project; larger deployments should add server-paginated order/report queries.
