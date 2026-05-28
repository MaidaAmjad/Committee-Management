-- ============================================================================
-- Auth users (Express API) — stored in Supabase PostgreSQL (no MongoDB)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.auth_users (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                       TEXT NOT NULL UNIQUE,
  password_hash               TEXT NOT NULL,
  full_name                   TEXT NOT NULL,
  phone                       TEXT,
  is_verified                 BOOLEAN NOT NULL DEFAULT false,
  verification_token          TEXT,
  verification_token_expires  TIMESTAMPTZ,
  reset_password_token        TEXT,
  reset_password_token_expires TIMESTAMPTZ,
  supabase_user_id            UUID,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_users_email ON public.auth_users (email);
CREATE INDEX IF NOT EXISTS idx_auth_users_verification_token ON public.auth_users (verification_token);
CREATE INDEX IF NOT EXISTS idx_auth_users_reset_token ON public.auth_users (reset_password_token);

ALTER TABLE public.auth_users ENABLE ROW LEVEL SECURITY;

-- No public policies: only the API (service role) reads/writes this table.

SELECT 'auth_users table ready!' AS status;
