-- User suspension (admin portal)
-- Run in Supabase SQL Editor

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_is_suspended ON public.profiles (is_suspended);

ALTER TABLE public.auth_users
  ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_auth_users_email_suspended ON public.auth_users (email, is_suspended);

SELECT 'User suspension columns ready' AS status;
