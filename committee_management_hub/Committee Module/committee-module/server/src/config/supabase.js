import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

let adminClient;

export function getSupabaseAdmin() {
  if (!adminClient) {
    adminClient = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminClient;
}

export async function verifySupabaseConnection() {
  const { error } = await getSupabaseAdmin().from('auth_users').select('id').limit(1);

  if (!error) return;

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
