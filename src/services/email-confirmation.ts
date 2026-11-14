import { createClient } from '@supabase/supabase-js';
import { publicConfigError } from '@/utils/public-config';

// Email can be opened in a different browser or device from the signup. Verify
// its token directly, without a PKCE verifier or a saved browser session.
export async function confirmSignupEmail(tokenHash: string) {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
  if (publicConfigError(url, key))
    throw new Error('Email confirmation is currently unavailable. Please try again later.');
  const client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'campusbite-email-confirmation',
    },
  });
  const { data, error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
  if (error) {
    if (error.code === 'otp_expired' || error.code === 'otp_disabled')
      throw new Error(
        'This link has expired or has already been used. If you already confirmed your email, you can sign in. Otherwise, create your account again to request a new email.',
      );
    throw new Error(
      'We could not confirm your email. Check your connection and try the link again.',
    );
  }
  if (!data.user?.email_confirmed_at)
    throw new Error('Your email has not been confirmed. Please open the confirmation link again.');
}
