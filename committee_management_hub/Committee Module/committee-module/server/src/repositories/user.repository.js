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

export async function findByEmail(email) {
  const { data, error } = await getSupabaseAdmin()
    .from(TABLE)
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error) dbError(error, 'Failed to load user.');
  return mapRow(data);
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
  if (patch.verificationToken !== undefined) row.verification_token = patch.verificationToken;
  if (patch.verificationTokenExpires !== undefined) {
    row.verification_token_expires = patch.verificationTokenExpires;
  }
  if (patch.resetPasswordToken !== undefined) row.reset_password_token = patch.resetPasswordToken;
  if (patch.resetPasswordTokenExpires !== undefined) {
    row.reset_password_token_expires = patch.resetPasswordTokenExpires;
  }
  if (patch.supabaseUserId !== undefined) row.supabase_user_id = patch.supabaseUserId;

  const { data, error } = await getSupabaseAdmin()
    .from(TABLE)
    .update(row)
    .eq('id', id)
    .select('*')
    .single();

  if (error) dbError(error, 'Failed to update user.');
  return mapRow(data);
}
