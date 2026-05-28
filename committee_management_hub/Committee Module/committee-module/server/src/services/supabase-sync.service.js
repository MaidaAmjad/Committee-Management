import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import { getSupabaseAdmin } from '../config/supabase.js';

let anonClient;

function getAnonClient() {
  if (!anonClient) {
    anonClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return anonClient;
}

/** Validate credentials against Supabase Auth (for legacy users not yet in auth_users). */
export async function signInWithSupabase(email, password) {
  const { data, error } = await getAnonClient().auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    return { user: null, error: error.message };
  }

  return { user: data.user, error: null };
}

export async function getSupabaseAuthUserById(userId) {
  if (!userId) return null;
  const { data, error } = await getSupabaseAdmin().auth.admin.getUserById(userId);
  if (error) {
    console.error('Supabase getUserById:', error.message);
    return null;
  }
  return data.user;
}

export async function getProfileById(userId) {
  const { data } = await getSupabaseAdmin()
    .from('profiles')
    .select('id, email, full_name, phone')
    .eq('id', userId)
    .maybeSingle();
  return data;
}

/** Create Supabase auth user (unconfirmed) and public profile row. */
export async function createSupabaseUser({ email, password, fullName, phone }) {
  const client = getSupabaseAdmin();

  const { data, error } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: {
      full_name: fullName,
      ...(phone ? { phone } : {}),
    },
  });

  if (error) {
    console.error('Supabase createUser:', error.message);
    return null;
  }

  const userId = data.user.id;
  await client.from('profiles').upsert({
    id: userId,
    email,
    full_name: fullName,
    phone: phone || null,
    trust_score: 0,
  });

  return userId;
}

export async function confirmSupabaseEmail(supabaseUserId) {
  if (!supabaseUserId) return;

  const { error } = await getSupabaseAdmin().auth.admin.updateUserById(supabaseUserId, {
    email_confirm: true,
  });

  if (error) {
    console.error('Supabase confirm email:', error.message);
  }
}

export async function updateSupabasePassword(supabaseUserId, newPassword) {
  if (!supabaseUserId) return;

  const { error } = await getSupabaseAdmin().auth.admin.updateUserById(supabaseUserId, {
    password: newPassword,
  });

  if (error) {
    console.error('Supabase password update:', error.message);
  }
}

export function isSupabaseEmailConfirmed(supabaseUser) {
  return Boolean(supabaseUser?.email_confirmed_at);
}
