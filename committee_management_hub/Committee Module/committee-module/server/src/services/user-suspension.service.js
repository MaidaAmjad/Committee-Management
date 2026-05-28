import { getSupabaseAdmin } from '../config/supabase.js';
import { AppError } from '../utils/AppError.js';
import * as userRepo from '../repositories/user.repository.js';

const LONG_BAN = '876000h';

export async function getProfileByEmail(email) {
  const normalized = email.trim().toLowerCase();
  const { data, error } = await getSupabaseAdmin()
    .from('profiles')
    .select('id, email, full_name, is_suspended')
    .eq('email', normalized)
    .maybeSingle();

  if (error) {
    console.error('getProfileByEmail:', error.message);
    return null;
  }
  return data;
}

export async function isEmailSuspended(email) {
  const profile = await getProfileByEmail(email);
  if (profile?.is_suspended) return true;

  const authUser = await userRepo.findByEmail(email.trim().toLowerCase());
  return Boolean(authUser?.isSuspended);
}

export async function assertEmailNotSuspended(email) {
  if (await isEmailSuspended(email)) {
    throw new AppError(
      'This email is associated with a suspended account. Contact support if you believe this is a mistake.',
      403
    );
  }
}

async function setSupabaseAuthBan(supabaseUserId, suspended) {
  if (!supabaseUserId) return;

  const { error } = await getSupabaseAdmin().auth.admin.updateUserById(supabaseUserId, {
    ban_duration: suspended ? LONG_BAN : 'none',
  });

  if (error) {
    console.error('Supabase auth ban update:', error.message);
  }
}

export async function suspendUserById(userId) {
  const { data: profile, error } = await getSupabaseAdmin()
    .from('profiles')
    .select('id, email')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new AppError('Failed to load user profile.', 500);
  if (!profile) throw new AppError('User not found.', 404);

  const { error: profileErr } = await getSupabaseAdmin()
    .from('profiles')
    .update({ is_suspended: true, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (profileErr) {
    if (profileErr.message?.includes('is_suspended') || profileErr.code === '42703') {
      throw new AppError('Run database-migrations/add-user-suspension.sql in Supabase.', 500);
    }
    throw new AppError(profileErr.message, 500);
  }

  const authUser = await userRepo.findByEmail(profile.email);
  if (authUser) {
    await userRepo.updateUser(authUser.id, { isSuspended: true });
    await setSupabaseAuthBan(authUser.supabaseUserId || userId, true);
  } else {
    await setSupabaseAuthBan(userId, true);
  }

  return { message: 'User suspended. They cannot sign in or register with this email.' };
}

export async function reinstateUserById(userId) {
  const { data: profile, error } = await getSupabaseAdmin()
    .from('profiles')
    .select('id, email')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new AppError('Failed to load user profile.', 500);
  if (!profile) throw new AppError('User not found.', 404);

  const { error: profileErr } = await getSupabaseAdmin()
    .from('profiles')
    .update({ is_suspended: false, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (profileErr) {
    if (profileErr.message?.includes('is_suspended') || profileErr.code === '42703') {
      throw new AppError('Run database-migrations/add-user-suspension.sql in Supabase.', 500);
    }
    throw new AppError(profileErr.message, 500);
  }

  const authUser = await userRepo.findByEmail(profile.email);
  if (authUser) {
    await userRepo.updateUser(authUser.id, { isSuspended: false });
    await setSupabaseAuthBan(authUser.supabaseUserId || userId, false);
  } else {
    await setSupabaseAuthBan(userId, false);
  }

  return { message: 'User reinstated. They can sign in again.' };
}
