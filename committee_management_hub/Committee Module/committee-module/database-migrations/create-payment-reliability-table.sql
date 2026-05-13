-- ============================================================================
-- Payment Reliability / Punctuality Trust Score System
-- ============================================================================

-- Table to track each payment's punctuality
CREATE TABLE IF NOT EXISTS public.payment_reliability (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  committee_id    UUID NOT NULL REFERENCES public.committees(id) ON DELETE CASCADE,
  proof_id        UUID REFERENCES public.payment_proofs(id) ON DELETE SET NULL,
  deadline_date   DATE NOT NULL,
  grace_end_date  DATE NOT NULL,
  submitted_date  DATE,           -- NULL = missed payment
  accepted_date   DATE,           -- Admin acceptance date
  days_late       INTEGER,        -- 0 = on time, negative = early, positive = late
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('on_time','slightly_late','late','grace_period','missed','pending')),
  points_earned   INTEGER NOT NULL DEFAULT 0,
  trust_impact    INTEGER NOT NULL DEFAULT 0,
  month_year      TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, committee_id, month_year)
);

CREATE INDEX IF NOT EXISTS idx_payment_reliability_user ON public.payment_reliability(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_reliability_committee ON public.payment_reliability(committee_id);

-- Add payment_reliability_score to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS payment_reliability_score INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payment_reliability_label TEXT DEFAULT NULL;

-- RLS
ALTER TABLE public.payment_reliability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read payment reliability"
ON public.payment_reliability FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Users can insert own reliability"
ON public.payment_reliability FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own reliability"
ON public.payment_reliability FOR UPDATE TO authenticated
USING (user_id = auth.uid());

SELECT 'payment_reliability table ready!' AS status;
