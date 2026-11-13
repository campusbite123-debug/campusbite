import { describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { provisionAdministrator, validateAdminInput } from '../scripts/lib/admin-provisioning.mjs';
import { publicConfigError } from '@/utils/public-config';
const require = createRequire(import.meta.url);
const { checkPublicEnvironment } = require('../scripts/check-public-env.cjs');
const input = {
  fullName: 'Jamie Santos',
  email: 'staff@school.test',
  staffId: 'STAFF-NEW',
  password: 'A-unique-test-password-123',
};
function mockClient(role = 'CUSTOMER', rpcError: any = null, lookupError: any = null) {
  return {
    auth: {
      admin: {
        createUser: vi.fn(async () => ({ data: { user: { id: 'new-account' } }, error: null })),
        deleteUser: vi.fn(async () => ({ error: null })),
        updateUserById: vi.fn(async () => ({ error: null })),
      },
    },
    rpc: vi.fn(async () => ({ error: rpcError })),
    from: vi.fn(() => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: { role }, error: lookupError }) }),
      }),
    })),
  };
}
describe('terminal-only administrator creation', () => {
  it('requires a strong password and valid identity before any request', async () => {
    const client = mockClient();
    await expect(
      provisionAdministrator(client as any, { ...input, password: 'short' }),
    ).rejects.toThrow(/12/);
    expect(client.auth.admin.createUser).not.toHaveBeenCalled();
    expect(() => validateAdminInput({ ...input, staffId: '!' })).toThrow(/Staff ID/);
  });
  it('creates a fresh Auth account and passes the matching server-only nonce', async () => {
    const client = mockClient();
    expect(await provisionAdministrator(client as any, input)).toEqual({ id: 'new-account' });
    const args = client.auth.admin.createUser.mock.calls[0] as any;
    expect(args[0].user_metadata).not.toHaveProperty('role');
    expect(args[0].app_metadata.admin_provisioning_id).toEqual(expect.any(String));
    expect(client.rpc).toHaveBeenCalledWith('terminal_provision_admin', {
      p_user_id: 'new-account',
      p_provisioning_id: args[0].app_metadata.admin_provisioning_id,
    });
    expect(client.auth.admin.deleteUser).not.toHaveBeenCalled();
  });
  it('never promotes or deletes an existing account when creation fails', async () => {
    const client = mockClient();
    client.auth.admin.createUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'already exists' },
    } as any);
    await expect(provisionAdministrator(client as any, input)).rejects.toThrow(/Existing accounts/);
    expect(client.rpc).not.toHaveBeenCalled();
    expect(client.auth.admin.deleteUser).not.toHaveBeenCalled();
  });
  it('rolls back only a newly created unprivileged account on failed provisioning', async () => {
    const client = mockClient('CUSTOMER', { message: 'RPC failed' });
    await expect(provisionAdministrator(client as any, input)).rejects.toThrow(/rolled back/);
    expect(client.auth.admin.deleteUser).toHaveBeenCalledWith('new-account');
  });
  it('recovers an already committed promotion after a lost RPC response', async () => {
    const client = mockClient('ADMIN', { message: 'network error' });
    expect(await provisionAdministrator(client as any, input)).toEqual({ id: 'new-account' });
    expect(client.auth.admin.deleteUser).not.toHaveBeenCalled();
  });
  it('disables an uncertain new account rather than deleting an unverified promotion', async () => {
    const client = mockClient('CUSTOMER', { message: 'network' }, { message: 'network' });
    await expect(provisionAdministrator(client as any, input)).rejects.toThrow(/disabled/);
    expect(client.auth.admin.deleteUser).not.toHaveBeenCalled();
    expect(client.auth.admin.updateUserById).toHaveBeenCalledWith('new-account', {
      ban_duration: '876000h',
    });
  });
});
describe('public configuration fails closed', () => {
  it('does not enable authentication without valid public configuration', () => {
    expect(publicConfigError('', '')).toBeTruthy();
    expect(publicConfigError('https://canteen.test', 'sb_secret_private')).toBeTruthy();
    expect(publicConfigError('https://canteen.test', 'sb_publishable_public')).toBe(null);
  });
  it('accepts a legacy anon key and rejects a service-role key', () => {
    const jwt = (role: string) =>
      `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.signature`;
    expect(publicConfigError('https://canteen.test', jwt('anon'))).toBe(null);
    expect(publicConfigError('https://canteen.test', jwt('service_role'))).toBeTruthy();
  });
  it('blocks exported server secrets without including their values in the error', () => {
    const secret = 'sb_secret_do_not_print_me';
    expect(() =>
      checkPublicEnvironment('nonexistent-fixture-directory', {
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: secret,
      }),
    ).toThrow(/Server credential/);
    try {
      checkPublicEnvironment('nonexistent-fixture-directory', {
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: secret,
      });
    } catch (e) {
      expect((e as Error).message).not.toContain(secret);
    }
  });
});
