-- Phone OTP auth (Firebase) — extends auth_users; pending rows until OTP verified

ALTER TABLE public.auth_users
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false;

-- Treat legacy email verification as phone verified for existing rows
UPDATE public.auth_users
SET phone_verified = true
WHERE is_verified = true AND phone_verified = false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_users_phone_unique
  ON public.auth_users (phone)
  WHERE phone IS NOT NULL;

-- Temporary signup / password-reset sessions (no user row until OTP succeeds)
CREATE TABLE IF NOT EXISTS public.pending_otp_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose         TEXT NOT NULL CHECK (purpose IN ('signup', 'password_reset')),
  phone           TEXT NOT NULL,
  password_hash   TEXT,
  full_name       TEXT,
  email           TEXT,
  user_id         UUID,
  resend_count    INT NOT NULL DEFAULT 0,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_otp_phone ON public.pending_otp_sessions (phone);
CREATE INDEX IF NOT EXISTS idx_pending_otp_expires ON public.pending_otp_sessions (expires_at);

ALTER TABLE public.pending_otp_sessions ENABLE ROW LEVEL SECURITY;

-- Refresh Supabase API schema cache after creating new tables
NOTIFY pgrst, 'reload schema';

SELECT 'Phone OTP auth migration ready!' AS status;
