import type { SupabaseClient } from '@supabase/supabase-js';
export type AdminInput = {
  fullName?: unknown;
  email?: unknown;
  staffId?: unknown;
  password?: unknown;
};
export function validateAdminInput(input: AdminInput): {
  fullName: string;
  email: string;
  staffId: string;
  password: string;
};
export function provisionAdministrator(
  client: Pick<SupabaseClient, 'auth' | 'rpc' | 'from'>,
  input: AdminInput,
): Promise<{ id: string }>;
