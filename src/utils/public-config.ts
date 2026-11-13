// Public client configuration must never contain a server credential.
export function publicConfigError(url: string, key: string): string | null {
  const unavailable = 'Sign-in is currently unavailable. Please contact the canteen.';
  if (!url || !key) return unavailable;
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== 'https:' &&
      !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))
    )
      return unavailable;
    if (key.startsWith('sb_publishable_')) return null;
    const payload = key.split('.')[1];
    const normalized = payload?.replace(/-/g, '+').replace(/_/g, '/');
    if (normalized && JSON.parse(atob(normalized)).role === 'anon') return null;
  } catch {
    /* Invalid settings leave authentication disabled. */
  }
  return unavailable;
}
