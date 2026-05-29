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

/** Find auth user by email (paginated scan). */
export async function findSupabaseUserByEmail(email) {
  const normalized = email.trim().toLowerCase();
  let page = 1;
  const perPage = 200;

  while (page <= 10) {
    const { data, error } = await getSupabaseAdmin().auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error('Supabase listUsers:', error.message);
      return null;
    }

    const match = data.users.find(u => u.email?.trim().toLowerCase() === normalized);
    if (match) return match;

    if (data.users.length < perPage) break;
    page += 1;
  }

  return null;
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

/** Send Supabase Auth signup confirmation email (uses Supabase built-in mailer). */
export async function sendSupabaseSignupConfirmation(email) {
  const redirectTo = `${env.clientUrl.replace(/\/$/, '')}/login?verified=1`;
  const normalized = email.trim().toLowerCase();

  const response = await fetch(`${env.supabaseUrl.replace(/\/$/, '')}/auth/v1/resend`, {
    method: 'POST',
    headers: {
      apikey: env.supabaseAnonKey,
      Authorization: `Bearer ${env.supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'signup',
      email: normalized,
      options: { emailRedirectTo: redirectTo },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Supabase resend failed (${response.status})`);
  }
}

export function isSupabaseEmailConfirmed(supabaseUser) {
  return Boolean(supabaseUser?.email_confirmed_at);
}

/** Remove Supabase Auth user (allows re-registration with same email). */
export async function deleteSupabaseAuthUser(supabaseUserId) {
  if (!supabaseUserId) return;
  const { error } = await getSupabaseAdmin().auth.admin.deleteUser(supabaseUserId);
  if (error && !/not found|unable to find/i.test(error.message)) {
    throw new Error(error.message);
  }
}
