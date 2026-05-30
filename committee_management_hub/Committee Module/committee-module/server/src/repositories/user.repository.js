import { getSupabaseAdmin } from '../config/supabase.js';
import { AppError } from '../utils/AppError.js';

const TABLE = 'auth_users';

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    fullName: row.full_name,
    phone: row.phone,
    isVerified: row.is_verified,
    phoneVerified: row.phone_verified ?? row.is_verified ?? false,
    isSuspended: row.is_suspended ?? false,
    verificationToken: row.verification_token,
    verificationTokenExpires: row.verification_token_expires
      ? new Date(row.verification_token_expires)
      : null,
    resetPasswordToken: row.reset_password_token,
    resetPasswordTokenExpires: row.reset_password_token_expires
      ? new Date(row.reset_password_token_expires)
      : null,
    supabaseUserId: row.supabase_user_id,
    createdAt: row.created_at,
  };
}

export function toPublicJSON(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    isVerified: user.isVerified,
    phoneVerified: user.phoneVerified,
    supabaseUserId: user.supabaseUserId,
    createdAt: user.createdAt,
  };
}

function dbError(error, fallback) {
  if (error.code === '23505') {
    throw new AppError('An account with this email already exists.', 409);
  }
  console.error(fallback, error.message);
  throw new AppError(fallback, 500);
}

/** Prefer verified rows when duplicate phone/email rows exist from prior signup attempts. */
function firstRow(data) {
  return mapRow(Array.isArray(data) ? data[0] : data);
}

export async function findByPhone(phone) {
  const { data, error } = await getSupabaseAdmin()
    .from(TABLE)
    .select('*')
    .eq('phone', phone)
    .order('is_verified', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) dbError(error, 'Failed to load user.');
  return firstRow(data);
}

export async function findByEmail(email) {
  const { data, error } = await getSupabaseAdmin()
    .from(TABLE)
    .select('*')
    .eq('email', email)
    .order('is_verified', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) dbError(error, 'Failed to load user.');
  return firstRow(data);
}

export async function listByPhone(phone) {
  const { data, error } = await getSupabaseAdmin()
    .from(TABLE)
    .select('*')
    .eq('phone', phone);

  if (error) dbError(error, 'Failed to load user.');
  return (data || []).map(mapRow);
}

export async function findById(id) {
  const { data, error } = await getSupabaseAdmin()
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) dbError(error, 'Failed to load user.');
  return mapRow(data);
}

export async function findByVerificationToken(hashedToken) {
  const now = new Date().toISOString();
  const { data, error } = await getSupabaseAdmin()
    .from(TABLE)
    .select('*')
    .eq('verification_token', hashedToken)
    .gt('verification_token_expires', now)
    .maybeSingle();

  if (error) dbError(error, 'Failed to verify email.');
  return mapRow(data);
}

export async function findByResetToken(hashedToken) {
  const now = new Date().toISOString();
  const { data, error } = await getSupabaseAdmin()
    .from(TABLE)
    .select('*')
    .eq('reset_password_token', hashedToken)
    .gt('reset_password_token_expires', now)
    .maybeSingle();

  if (error) dbError(error, 'Failed to reset password.');
  return mapRow(data);
}

export async function findBySupabaseUserId(supabaseUserId) {
  const { data, error } = await getSupabaseAdmin()
    .from(TABLE)
    .select('*')
    .eq('supabase_user_id', supabaseUserId)
    .maybeSingle();

  if (error) dbError(error, 'Failed to load user.');
  return mapRow(data);
}

export async function createUser(record) {
  const { data, error } = await getSupabaseAdmin()
    .from(TABLE)
    .insert({
      email: record.email,
      password_hash: record.passwordHash,
      full_name: record.fullName,
      phone: record.phone,
      is_verified: record.isVerified ?? false,
      phone_verified: record.phoneVerified ?? record.isVerified ?? false,
      verification_token: record.verificationToken ?? null,
      verification_token_expires: record.verificationTokenExpires?.toISOString() ?? null,
      supabase_user_id: record.supabaseUserId ?? null,
    })
    .select('*')
    .single();

  if (error) dbError(error, 'Failed to create user.');
  return mapRow(data);
}

export async function updateUser(id, patch) {
  const row = {
    updated_at: new Date().toISOString(),
  };

  if (patch.passwordHash !== undefined) row.password_hash = patch.passwordHash;
  if (patch.fullName !== undefined) row.full_name = patch.fullName;
  if (patch.phone !== undefined) row.phone = patch.phone;
  if (patch.isVerified !== undefined) row.is_verified = patch.isVerified;
  if (patch.phoneVerified !== undefined) row.phone_verified = patch.phoneVerified;
  if (patch.isSuspended !== undefined) row.is_suspended = patch.isSuspended;
  if (patch.verificationToken !== undefined) row.verification_token = patch.verificationToken;
  if (patch.verificationTokenExpires !== undefined) {
    row.verification_token_expires = patch.verificationTokenExpires;
  }
  if (patch.resetPasswordToken !== undefined) row.reset_password_token = patch.resetPasswordToken;
  if (patch.resetPasswordTokenExpires !== undefined) {
    row.reset_password_token_expires = patch.resetPasswordTokenExpires;
  }
  if (patch.supabaseUserId !== undefined) row.supabase_user_id = patch.supabaseUserId;
  if (patch.email !== undefined) row.email = patch.email.trim().toLowerCase();

  const { data, error } = await getSupabaseAdmin()
    .from(TABLE)
    .update(row)
    .eq('id', id)
    .select('*')
    .single();

  if (error) dbError(error, 'Failed to update user.');
  return mapRow(data);
}

export async function deleteById(id) {
  const { error } = await getSupabaseAdmin().from(TABLE).delete().eq('id', id);
  if (error) dbError(error, 'Failed to delete user.');
}

export async function deleteByEmail(email) {
  const { error } = await getSupabaseAdmin()
    .from(TABLE)
    .delete()
    .eq('email', email.trim().toLowerCase());
  if (error) dbError(error, 'Failed to delete user.');
}
