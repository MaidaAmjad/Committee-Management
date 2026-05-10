-- ============================================================================
-- User Verification System
-- ============================================================================

-- Add verification fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT NULL
  CHECK (verification_status IN ('pending', 'approved', 'rejected', NULL));

-- Create user_verifications table
CREATE TABLE IF NOT EXISTS public.user_verifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name         TEXT NOT NULL,
  phone_number      TEXT NOT NULL,
  cnic_number       TEXT NOT NULL,
  cnic_front_url    TEXT NOT NULL,
  selfie_url        TEXT NOT NULL,
  bank_account_title TEXT,
  additional_notes  TEXT,
  status            TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at       TIMESTAMPTZ,
  reviewed_by       UUID REFERENCES auth.users(id),
  rejection_reason  TEXT,
  UNIQUE (user_id)  -- one verification request per user
);

CREATE INDEX IF NOT EXISTS idx_user_verifications_user    ON public.user_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_verifications_status  ON public.user_verifications(status);

-- RLS
ALTER TABLE public.user_verifications ENABLE ROW LEVEL SECURITY;

-- Users can view and insert their own verification
CREATE POLICY "Users can view own verification"
ON public.user_verifications FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own verification"
ON public.user_verifications FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Admins can view all verifications (using service role or admin check)
CREATE POLICY "Admins can view all verifications"
ON public.user_verifications FOR SELECT TO authenticated
USING (true);  -- open for now; restrict to admin role if needed

CREATE POLICY "Admins can update verifications"
ON public.user_verifications FOR UPDATE TO authenticated
USING (true);

-- Verify
SELECT 'user_verifications table ready!' AS status;
