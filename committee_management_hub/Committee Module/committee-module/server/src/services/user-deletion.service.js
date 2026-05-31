import { getSupabaseAdmin } from '../config/supabase.js';
import { AppError } from '../utils/AppError.js';
import * as userRepo from '../repositories/user.repository.js';
import {
  deleteSupabaseAuthUser,
  getSupabaseAuthUserById,
  findSupabaseUserByEmail,
} from './supabase-sync.service.js';
import { deleteFirebaseUserByEmail } from '../config/firebase-admin.js';

/** Resolve email for a Supabase auth / profile user id. */
async function resolveEmail(userId) {
  const supabase = getSupabaseAdmin();

  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .maybeSingle();
  if (profile?.email) return profile.email.trim().toLowerCase();

  const authRow = await userRepo.findByEmail(userId);
  if (authRow?.email) return authRow.email;

  const sbUser = await getSupabaseAuthUserById(userId);
  if (sbUser?.email) return sbUser.email.trim().toLowerCase();

  return null;
}

async function resolvePhone(userId, email) {
  const supabase = getSupabaseAdmin();
  const { data: profile } = await supabase
    .from('profiles')
    .select('phone')
    .eq('id', userId)
    .maybeSingle();
  if (profile?.phone) return profile.phone;

  const authRow = await userRepo.findByEmail(email);
  return authRow?.phone ?? null;
}

/** Best-effort delete of rows tied to profiles.id / auth.users.id. */
async function deleteRelatedUserData(supabase, userId) {
  const steps = [
    { label: 'committee_members', run: () => supabase.from('committee_members').delete().eq('user_id', userId) },
    { label: 'payment_methods', run: () => supabase.from('payment_methods').delete().eq('user_id', userId) },
    { label: 'payment_proofs', run: () => supabase.from('payment_proofs').delete().eq('uploader_id', userId) },
    { label: 'payment_reliability', run: () => supabase.from('payment_reliability').delete().eq('user_id', userId) },
    { label: 'user_verifications', run: () => supabase.from('user_verifications').delete().eq('user_id', userId) },
    { label: 'message_reads', run: () => supabase.from('message_reads').delete().eq('user_id', userId) },
    { label: 'reviews_as_reviewer', run: () => supabase.from('reviews').delete().eq('reviewer_id', userId) },
    { label: 'reviews_as_reviewed', run: () => supabase.from('reviews').delete().eq('reviewed_id', userId) },
  ];

  for (const step of steps) {
    const { error } = await step.run();
    if (error && error.code !== '42P01' && error.code !== 'PGRST205') {
      console.warn(`deleteRelatedUserData (${step.label}):`, error.message);
    }
  }
}

async function deletePendingOtpSessions(supabase, email, phone) {
  const normalized = email.trim().toLowerCase();
  const { error: emailErr } = await supabase.from('pending_otp_sessions').delete().eq('email', normalized);
  if (emailErr && emailErr.code !== '42P01' && emailErr.code !== 'PGRST205') {
    console.warn('deletePendingOtpSessions email:', emailErr.message);
  }
  if (phone) {
    const { error: phoneErr } = await supabase.from('pending_otp_sessions').delete().eq('phone', phone);
    if (phoneErr && phoneErr.code !== '42P01' && phoneErr.code !== 'PGRST205') {
      console.warn('deletePendingOtpSessions phone:', phoneErr.message);
    }
  }
}

/** Remove unverified auth_users rows for a phone (failed/partial signups). */
export async function purgeUnverifiedAuthByPhone(phone) {
  const supabase = getSupabaseAdmin();
  const { data: rows, error } = await supabase
    .from('auth_users')
    .select('id, email, supabase_user_id, is_verified')
    .eq('phone', phone);

  if (error) {
    console.error('purgeUnverifiedAuthByPhone:', error.message);
    return;
  }

  for (const row of rows || []) {
    if (row.is_verified) continue;
    await userRepo.deleteById(row.id);
    if (row.supabase_user_id) {
      await deleteSupabaseAuthUser(row.supabase_user_id);
      continue;
    }
    const supabaseUser = await findSupabaseUserByEmail(row.email);
    if (supabaseUser) {
      await deleteSupabaseAuthUser(supabaseUser.id);
    }
    if (row.email) {
      await deleteFirebaseUserByEmail(row.email);
    }
  }
}

/**
 * Remove auth_users, Supabase Auth, Firebase Auth, and pending OTP rows for an email.
 * Profile may already be deleted.
 */
export async function purgeAuthRecordsForEmail(email, { phone } = {}) {
  const normalized = email.trim().toLowerCase();
  const supabase = getSupabaseAdmin();

  await userRepo.deleteByEmail(normalized);

  const supabaseUser = await findSupabaseUserByEmail(normalized);
  if (supabaseUser) {
    await deleteSupabaseAuthUser(supabaseUser.id);
  }

  await deleteFirebaseUserByEmail(normalized);
  await deletePendingOtpSessions(supabase, normalized, phone);
}

/**
 * Delete user from app data, auth_users, Supabase Auth, and Firebase Auth.
 * userId is the Supabase auth UUID (same as profiles.id).
 */
export async function deleteUserCompletely(userId) {
  const supabase = getSupabaseAdmin();
  const email = await resolveEmail(userId);

  if (!email) {
    throw new AppError('User not found.', 404);
  }

  const phone = await resolvePhone(userId, email);

  const { error: memErr } = await supabase.from('committee_members').delete().eq('user_id', userId);
  if (memErr) {
    throw new AppError(`Failed to remove committee memberships: ${memErr.message}`, 500);
  }

  await deleteRelatedUserData(supabase, userId);

  const { error: profileErr } = await supabase.from('profiles').delete().eq('id', userId);
  if (profileErr) {
    throw new AppError(`Failed to delete profile: ${profileErr.message}`, 500);
  }

  await deleteSupabaseAuthUser(userId);

  await purgeAuthRecordsForEmail(email, { phone });

  return {
    message:
      'User deleted completely (profile, auth, Firebase, and related data). They can sign up again with the same email.',
  };
}
