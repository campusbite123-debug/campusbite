# Signup email confirmation

The signup email opens the public `/auth/confirm` page. That page verifies the
one-time email token with Supabase, then displays **Your account is confirmed.**
Students return to the mobile app and sign in with their email and password.
Confirmation works even when Gmail opens a different browser from the signup.
The page does not save a browser login session or require a PKCE verifier.

The current production site is **https://campusbite.expo.app**. Its confirmation
route is **https://campusbite.expo.app/auth/confirm** and expects a real email
token. Visiting that route directly correctly asks for the signup email link.

## Publish the page

From the `campus-canteen` directory, with the real public Supabase variables in
`.env`, run:

```powershell
npm run build:web
npx eas-cli@latest deploy --prod
```

On the first deployment, choose the project's Expo Hosting subdomain. Copy the
production HTTPS URL printed by the command (not an `expo.dev` dashboard URL,
an APK download URL, or a temporary deployment URL).

## Configure the hosted Supabase project

Local `supabase/config.toml` changes do not change the hosted dashboard settings.

Configure **custom SMTP** before editing the hosted email template. If the Emails
page says **Set up custom SMTP to edit templates**, click **Set up SMTP**, enter
your email provider's sender address, host, port, username and password, and save.
The default Supabase mail service keeps the subject and body locked on that page.

1. Open **Authentication → URL Configuration** in the Supabase dashboard.
2. Set **Site URL** to `https://campusbite.expo.app`, without a trailing slash.
   If deploying a separate project, use that project's production HTTPS origin.
3. Keep the mobile/password-recovery redirect addresses in **Redirect URLs**:
   `campuscanteen://**`, your production `/reset-password` URL, and any local
   development addresses you still use.
4. Open **Authentication → Email → Templates → Confirm signup** (called
   **Email Templates → Confirm signup** in some dashboard versions).
5. Set the subject to **Confirm your Campusbite account**. Paste the contents of
   [`supabase/templates/confirmation.html`](../supabase/templates/confirmation.html)
   into the email body and save.
6. Keep **Confirm email** enabled for the Email authentication provider.

The template deliberately uses `{{ .SiteURL }}/auth/confirm` and
`{{ .TokenHash }}`. Do not replace its link with `{{ .ConfirmationURL }}`: the
confirmation page verifies the token itself. The template ignores old apps'
local `redirect_to` values, so existing installed APKs can use the new email flow.

## Verify

Create a fresh student account, open its new Gmail confirmation email, and click
**Confirm my account**. The page must verify the token before showing success.
Return to the app and sign in. Expired/used links must explain the problem, and
opening `/auth/confirm` without an email token must never display success.

Emails sent before changing the template retain their original links. Test with
a new confirmation email after saving the settings.
