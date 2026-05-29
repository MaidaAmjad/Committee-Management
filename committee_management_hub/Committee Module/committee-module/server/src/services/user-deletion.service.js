import { getSupabaseAdmin } from '../config/supabase.js';
import { AppError } from '../utils/AppError.js';
import * as userRepo from '../repositories/user.repository.js';
import {
  deleteSupabaseAuthUser,
  getSupabaseAuthUserById,
  findSupabaseUserByEmail,
} from './supabase-sync.service.js';

/** Resolve email for a Supabase auth / profile user id. */
async function resolveEmail(userId) {
  const supabase = getSupabaseAdmin();

  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .maybeSingle();
  if (profile?.email) return profile.email.trim().toLowerCase();

  const authRow = await userRepo.findBySupabaseUserId(userId);
  if (authRow?.email) return authRow.email;

  const sbUser = await getSupabaseAuthUserById(userId);
  if (sbUser?.email) return sbUser.email.trim().toLowerCase();

  return null;
}

/** Remove auth_users + Supabase Auth rows for an email (profile may already be gone). */
export async function purgeAuthRecordsForEmail(email) {
  const normalized = email.trim().toLowerCase();
  const authRow = await userRepo.findByEmail(normalized);
  if (authRow) {
    await userRepo.deleteById(authRow.id);
  }

  const supabaseUser =
    (authRow?.supabaseUserId ? await getSupabaseAuthUserById(authRow.supabaseUserId) : null) ||
    (await findSupabaseUserByEmail(normalized));

  if (supabaseUser) {
    await deleteSupabaseAuthUser(supabaseUser.id);
  }
}

/**
 * Delete user from profiles, memberships, auth_users, and Supabase Auth.
 * userId is the Supabase auth UUID (same as profiles.id).
 */
export async function deleteUserCompletely(userId) {
  const supabase = getSupabaseAdmin();
  const email = await resolveEmail(userId);

  if (!email) {
    throw new AppError('User not found.', 404);
  }

  const { error: memErr } = await supabase.from('committee_members').delete().eq('user_id', userId);
  if (memErr) {
    throw new AppError(`Failed to remove committee memberships: ${memErr.message}`, 500);
  }

  await supabase.from('payment_methods').delete().eq('user_id', userId);
  await supabase.from('profiles').delete().eq('id', userId);

  await purgeAuthRecordsForEmail(email);

  return { message: 'User deleted completely. They can sign up again with the same email.' };
}
