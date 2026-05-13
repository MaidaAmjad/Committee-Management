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

DROP POLICY IF EXISTS "Committee approvers can insert reliability" ON public.payment_reliability;
CREATE POLICY "Committee approvers can insert reliability"
ON public.payment_reliability
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR committee_id IN (
    SELECT id FROM public.committees WHERE created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.winner_selections ws
    INNER JOIN public.committee_members cm ON cm.id = ws.member_id
    WHERE ws.committee_id = payment_reliability.committee_id
      AND cm.user_id = auth.uid()
      AND ws.id = (
        SELECT id
        FROM public.winner_selections
        WHERE committee_id = payment_reliability.committee_id
        ORDER BY created_at DESC
        LIMIT 1
      )
  )
);

DROP POLICY IF EXISTS "Committee approvers can update reliability" ON public.payment_reliability;
CREATE POLICY "Committee approvers can update reliability"
ON public.payment_reliability
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR committee_id IN (
    SELECT id FROM public.committees WHERE created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.winner_selections ws
    INNER JOIN public.committee_members cm ON cm.id = ws.member_id
    WHERE ws.committee_id = payment_reliability.committee_id
      AND cm.user_id = auth.uid()
      AND ws.id = (
        SELECT id
        FROM public.winner_selections
        WHERE committee_id = payment_reliability.committee_id
        ORDER BY created_at DESC
        LIMIT 1
      )
  )
)
WITH CHECK (
  user_id = auth.uid()
  OR committee_id IN (
    SELECT id FROM public.committees WHERE created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.winner_selections ws
    INNER JOIN public.committee_members cm ON cm.id = ws.member_id
    WHERE ws.committee_id = payment_reliability.committee_id
      AND cm.user_id = auth.uid()
      AND ws.id = (
        SELECT id
        FROM public.winner_selections
        WHERE committee_id = payment_reliability.committee_id
        ORDER BY created_at DESC
        LIMIT 1
      )
  )
);

SELECT 'payment approval tracking ready' AS status;
