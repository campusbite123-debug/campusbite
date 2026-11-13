import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ values: new Map<string, string>(), fail: false }));
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('expo-crypto', () => ({ randomUUID: () => crypto.randomUUID() }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: {} }));
vi.mock('expo-secure-store', () => ({
  getItemAsync: async (key: string) => mock.values.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => {
    if (mock.fail) throw new Error('Keychain unavailable');
    mock.values.set(key, value);
  },
  deleteItemAsync: async (key: string) => {
    mock.values.delete(key);
  },
}));
import { sessionStorage } from '@/services/session-storage';
beforeEach(() => {
  mock.values.clear();
  mock.fail = false;
});
describe('native secure session persistence', () => {
  it('round-trips a token larger than a single Keychain entry', async () => {
    const token = JSON.stringify({
      access_token: 'a'.repeat(6000),
      refresh_token: 'b'.repeat(100),
    });
    await sessionStorage.setItem('auth', token);
    expect(await sessionStorage.getItem('auth')).toBe(token);
    expect(mock.values.size).toBeGreaterThan(2);
    for (const value of mock.values.values())
      expect(Buffer.byteLength(value, 'utf8')).toBeLessThan(2048);
  });
  it('preserves multibyte names across chunk boundaries', async () => {
    const value = 'a'.repeat(449) + '🍜'.repeat(600) + 'José';
    await sessionStorage.setItem('auth', value);
    expect(await sessionStorage.getItem('auth')).toBe(value);
    for (const part of mock.values.values())
      expect(Buffer.byteLength(part, 'utf8')).toBeLessThan(2048);
  });
  it('replaces old generations and removes every active token chunk on logout', async () => {
    await sessionStorage.setItem('auth', 'a'.repeat(5000));
    await sessionStorage.setItem('auth', 'new-token');
    expect(mock.values.size).toBe(2);
    expect(await sessionStorage.getItem('auth')).toBe('new-token');
    await sessionStorage.removeItem('auth');
    expect(mock.values.size).toBe(0);
    expect(await sessionStorage.getItem('auth')).toBe(null);
  });
  it('does not replace the committed token if a secure write fails', async () => {
    await sessionStorage.setItem('auth', 'old-token');
    mock.fail = true;
    await expect(sessionStorage.setItem('auth', 'new-token')).rejects.toThrow('Keychain');
    expect(await sessionStorage.getItem('auth')).toBe('old-token');
  });
  it('returns no session rather than a truncated token when a chunk is missing', async () => {
    await sessionStorage.setItem('auth', 'a'.repeat(1000));
    const manifest = JSON.parse(mock.values.get('auth.manifest')!);
    mock.values.delete(`auth.${manifest.generation}.1`);
    expect(await sessionStorage.getItem('auth')).toBe(null);
  });
});
