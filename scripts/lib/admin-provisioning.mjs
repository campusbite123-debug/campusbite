import { randomUUID } from 'node:crypto';

export function validateAdminInput(input) {
  const fullName = String(input.fullName ?? '').trim();
  const email = String(input.email ?? '')
    .trim()
    .toLowerCase();
  const staffId = String(input.staffId ?? '')
    .trim()
    .toUpperCase();
  const password = String(input.password ?? '');
  if (fullName.length < 2 || fullName.length > 100)
    throw new Error('Full name must contain 2–100 characters.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  if (!/^[A-Z0-9-]{4,30}$/.test(staffId))
    throw new Error('Staff ID must contain 4–30 letters, numbers or dashes.');
  if (password.length < 12 || password.length > 128)
    throw new Error('Use an administrator password with 12–128 characters.');
  return { fullName, email, staffId, password };
}

export async function provisionAdministrator(client, input) {
  const clean = validateAdminInput(input);
  const nonce = randomUUID();
  const created = await client.auth.admin.createUser({
    email: clean.email,
    password: clean.password,
    email_confirm: true,
    user_metadata: { full_name: clean.fullName, student_id: clean.staffId },
    app_metadata: { admin_provisioning_id: nonce },
  });
  if (created.error || !created.data.user)
    throw new Error(
      'Account creation failed. Check the email, unique staff ID, project migrations and server credential. Existing accounts are never promoted by this command.',
    );
  const user = created.data.user;
  const result = await client.rpc('terminal_provision_admin', {
    p_user_id: user.id,
    p_provisioning_id: nonce,
  });
  if (!result.error) return { id: user.id };

  // A network failure may occur after the transaction committed. Check before any rollback.
  const role = await client.from('user_roles').select('role').eq('user_id', user.id).single();
  if (!role.error && role.data?.role === 'ADMIN') return { id: user.id };
  if (!role.error && role.data?.role === 'CUSTOMER') {
    const removed = await client.auth.admin.deleteUser(user.id);
    if (!removed.error)
      throw new Error(
        'Administrator provisioning failed. The newly created account was rolled back. Apply migration 005 and try again.',
      );
  }
  // Fail closed if the account state is uncertain or cleanup failed.
  const disabled = await client.auth.admin.updateUserById(user.id, { ban_duration: '876000h' });
  throw new Error(
    disabled.error
      ? `Provisioning could not be verified. Inspect account ${user.id} in the project before retrying; no password was printed.`
      : `Provisioning could not be verified. New account ${user.id} has been disabled; resolve it in the project before retrying.`,
  );
}
