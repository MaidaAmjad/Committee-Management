-- ============================================================================
-- Earned Trust Defaults
-- ============================================================================
-- New accounts must not inherit a high trust score. Trust is earned through
-- verification, reviews, payment reliability, and committee participation.

ALTER TABLE public.profiles
ALTER COLUMN trust_score SET DEFAULT 0;

UPDATE public.profiles p
SET
  trust_score = 0,
  payment_reliability_score = COALESCE(p.payment_reliability_score, 0),
  payment_reliability_label = COALESCE(p.payment_reliability_label, 'New User')
WHERE COALESCE(p.trust_score, 95) = 95
  AND COALESCE(p.is_verified, false) = false
  AND NOT EXISTS (
    SELECT 1
    FROM public.member_reviews r
    WHERE r.reviewed_id = p.id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.payment_reliability pr
    WHERE pr.user_id = p.id
      AND pr.status <> 'pending'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.committee_members cm
    WHERE cm.user_id = p.id
      AND cm.status = 'approved'
  );

SELECT 'earned trust defaults fixed' AS status;
