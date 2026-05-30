import { getSupabaseAdmin, resetSupabaseAdminClient } from '../config/supabase.js';
import { AppError } from '../utils/AppError.js';

const TABLE = 'pending_otp_sessions';

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    purpose: row.purpose,
    phone: row.phone,
    passwordHash: row.password_hash,
    fullName: row.full_name,
    email: row.email,
    userId: row.user_id,
    resendCount: row.resend_count,
    expiresAt: new Date(row.expires_at),
    createdAt: row.created_at,
  };
}

const MIGRATION_HINT =
  'Run database-migrations/add-phone-otp-auth.sql in the Supabase SQL Editor, then retry signup.';

const SCHEMA_CACHE_HINT =
  'Database migration was applied but the API cache is stale. Restart the server (npm run dev in server/), then retry signup.';

function isSchemaCacheError(error) {
  const msg = error?.message || '';
  return (
    error?.code === 'PGRST205' ||
    msg.includes('schema cache') ||
    msg.includes('Could not find the table')
  );
}

function isMissingTableError(error) {
  return error?.code === '42P01' || (error?.message || '').includes('does not exist');
}

function dbError(error, fallback) {
  const msg = error.message || '';
  if (isMissingTableError(error)) {
    throw new AppError(MIGRATION_HINT, 503);
  }
  if (isSchemaCacheError(error)) {
    throw new AppError(SCHEMA_CACHE_HINT, 503);
  }
  if (msg.includes('pending_otp_sessions')) {
    console.error(fallback, msg);
    throw new AppError(SCHEMA_CACHE_HINT, 503);
  }
  console.error(fallback, msg);
  throw new AppError(fallback, 500);
}

async function withSchemaRetry(operation) {
  let result = await operation();
  if (result.error && isSchemaCacheError(result.error)) {
    resetSupabaseAdminClient();
    result = await operation();
  }
  return result;
}

export async function createSession(record) {
  const { data, error } = await withSchemaRetry(() =>
    getSupabaseAdmin()
      .from(TABLE)
      .insert({
        purpose: record.purpose,
        phone: record.phone,
        password_hash: record.passwordHash ?? null,
        full_name: record.fullName ?? null,
        email: record.email ?? null,
        user_id: record.userId ?? null,
        resend_count: 0,
        expires_at: record.expiresAt.toISOString(),
      })
      .select('*')
      .single()
  );

  if (error) dbError(error, 'Failed to create OTP session.');
  return mapRow(data);
}

export async function findById(id) {
  const { data, error } = await getSupabaseAdmin().from(TABLE).select('*').eq('id', id).maybeSingle();
  if (error) dbError(error, 'Failed to load OTP session.');
  return mapRow(data);
}

export async function incrementResend(id, resendCount) {
  const { data, error } = await getSupabaseAdmin()
    .from(TABLE)
    .update({ resend_count: resendCount })
    .eq('id', id)
    .select('*')
    .single();

  if (error) dbError(error, 'Failed to update OTP session.');
  return mapRow(data);
}

export async function deleteById(id) {
  await getSupabaseAdmin().from(TABLE).delete().eq('id', id);
}
