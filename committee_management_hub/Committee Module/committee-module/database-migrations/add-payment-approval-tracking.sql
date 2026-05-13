-- ============================================================================
-- Payment Approval Trust Tracking
-- ============================================================================
-- Stores admin acceptance metadata and payment punctuality history used for
-- public trust score and payment reliability analytics.

ALTER TABLE public.payment_proofs
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.payment_reliability
ADD COLUMN IF NOT EXISTS accepted_date DATE,
ADD COLUMN IF NOT EXISTS trust_impact INTEGER NOT NULL DEFAULT 0;

UPDATE public.payment_reliability
SET trust_impact = points_earned
WHERE trust_impact = 0
  AND points_earned <> 0;

SELECT 'payment approval tracking ready' AS status;
