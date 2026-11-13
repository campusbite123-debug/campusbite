import 'react-native-url-polyfill/auto';
import { sessionStorage } from './session-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { publicConfigError } from '@/utils/public-config';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
export const configurationError = publicConfigError(url, key);
const browserOrDevice = Platform.OS !== 'web' || typeof window !== 'undefined';
export const supabase =
  !configurationError && browserOrDevice
    ? createClient(url, key, {
        auth: {
          storage: sessionStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: Platform.OS === 'web',
          flowType: 'pkce',
          lock: processLock,
        },
      })
    : null;
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
