import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

let adminClient;

export function resetSupabaseAdminClient() {
  adminClient = null;
}

export function getSupabaseAdmin() {
  if (!adminClient) {
    adminClient = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminClient;
}

export async function verifySupabaseConnection() {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('auth_users').select('id').limit(1);

  if (error) {
    const msg = error.message || '';
    if (msg.includes('Invalid API key')) {
      throw new Error(
        'Invalid Supabase service role key. Copy the service_role key into server/.env (not .env.example).'
      );
    }
    if (msg.includes('does not exist') || error.code === '42P01') {
      throw new Error(
        'Table auth_users not found. Run database-migrations/create-auth-users-table.sql in Supabase SQL Editor.'
      );
    }
    throw new Error(`Supabase connection failed: ${msg}`);
  }

  const { error: otpTableError } = await supabase.from('pending_otp_sessions').select('id').limit(1);
  if (otpTableError) {
    const msg = otpTableError.message || '';
    if (
      otpTableError.code === '42P01' ||
      otpTableError.code === 'PGRST205' ||
      msg.includes('pending_otp_sessions') ||
      msg.includes('schema cache')
    ) {
      console.warn(
        'Phone OTP signup disabled: pending_otp_sessions table missing.\n' +
          'Run database-migrations/add-phone-otp-auth.sql in Supabase SQL Editor.'
      );
      return;
    }
    throw new Error(`Supabase connection failed: ${msg}`);
  }
}
