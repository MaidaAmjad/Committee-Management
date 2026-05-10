-- ============================================================================
-- Create Payment Proofs Table (Correct Structure)
-- ============================================================================
-- This table stores payment proof uploads (screenshots, PDFs) from members
-- ============================================================================

-- Drop old table if it exists with wrong structure
-- DROP TABLE IF EXISTS payment_proofs CASCADE;

-- Create payment_proofs table with correct structure
CREATE TABLE IF NOT EXISTS public.payment_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID NOT NULL REFERENCES public.committees(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uploader_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'pdf')),
  file_url TEXT NOT NULL,
  month_year TEXT NOT NULL, -- Format: "2026-05"
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_proofs_committee 
ON public.payment_proofs(committee_id);

CREATE INDEX IF NOT EXISTS idx_payment_proofs_uploader 
ON public.payment_proofs(uploader_id);

CREATE INDEX IF NOT EXISTS idx_payment_proofs_month 
ON public.payment_proofs(committee_id, month_year);

CREATE INDEX IF NOT EXISTS idx_payment_proofs_status 
ON public.payment_proofs(status);

-- Enable Row Level Security
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own payment proofs" ON public.payment_proofs;
DROP POLICY IF EXISTS "Committee owners can view all payment proofs" ON public.payment_proofs;
DROP POLICY IF EXISTS "Committee members can view payment proofs for their committees" ON public.payment_proofs;
DROP POLICY IF EXISTS "Current winners can view all payment proofs for their committee" ON public.payment_proofs;
DROP POLICY IF EXISTS "Users can submit their own payment proofs" ON public.payment_proofs;
DROP POLICY IF EXISTS "Committee owners can update payment proof status" ON public.payment_proofs;
DROP POLICY IF EXISTS "Current winners can update payment proof status" ON public.payment_proofs;

-- Policy 1: Users can view their own payment proofs
CREATE POLICY "Users can view their own payment proofs"
ON public.payment_proofs
FOR SELECT
USING (uploader_id = auth.uid());

-- Policy 2: Committee owners can view all payment proofs
CREATE POLICY "Committee owners can view all payment proofs"
ON public.payment_proofs
FOR SELECT
USING (
  committee_id IN (
    SELECT id FROM public.committees WHERE created_by = auth.uid()
  )
);

-- Policy 3: Committee members can view payment proofs for their committees
CREATE POLICY "Committee members can view payment proofs for their committees"
ON public.payment_proofs
FOR SELECT
USING (
  committee_id IN (
    SELECT committee_id 
    FROM public.committee_members 
    WHERE user_id = auth.uid() AND status = 'approved'
  )
);

-- Policy 4: Current winners can view all payment proofs for their committee
CREATE POLICY "Current winners can view all payment proofs for their committee"
ON public.payment_proofs
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.winner_selections ws
    INNER JOIN public.committee_members cm ON cm.id = ws.member_id
    WHERE ws.committee_id = payment_proofs.committee_id
      AND cm.user_id = auth.uid()
      AND ws.id = (
        SELECT id 
        FROM public.winner_selections 
        WHERE committee_id = payment_proofs.committee_id
        ORDER BY created_at DESC 
        LIMIT 1
      )
  )
);

-- Policy 5: Users can submit their own payment proofs
CREATE POLICY "Users can submit their own payment proofs"
ON public.payment_proofs
FOR INSERT
WITH CHECK (uploader_id = auth.uid());

-- Policy 6: Committee owners can update payment proof status
CREATE POLICY "Committee owners can update payment proof status"
ON public.payment_proofs
FOR UPDATE
USING (
  committee_id IN (
    SELECT id FROM public.committees WHERE created_by = auth.uid()
  )
);

-- Policy 7: Current winners can update payment proof status (accept/reject)
CREATE POLICY "Current winners can update payment proof status"
ON public.payment_proofs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.winner_selections ws
    INNER JOIN public.committee_members cm ON cm.id = ws.member_id
    WHERE ws.committee_id = payment_proofs.committee_id
      AND cm.user_id = auth.uid()
      AND ws.id = (
        SELECT id 
        FROM public.winner_selections 
        WHERE committee_id = payment_proofs.committee_id
        ORDER BY created_at DESC 
        LIMIT 1
      )
  )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_proofs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS payment_proofs_updated_at ON public.payment_proofs;
CREATE TRIGGER payment_proofs_updated_at
  BEFORE UPDATE ON public.payment_proofs
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_proofs_updated_at();

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check table structure
/*
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'payment_proofs'
ORDER BY ordinal_position;
*/

-- Check RLS policies
/*
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'payment_proofs'
ORDER BY policyname;
*/

-- Test query as winner (should return all proofs for your committee)
/*
SELECT 
  pp.id,
  pp.committee_id,
  pp.uploader_name,
  pp.file_name,
  pp.file_type,
  pp.status,
  pp.month_year,
  pp.created_at
FROM public.payment_proofs pp
WHERE pp.committee_id IN (
  SELECT ws.committee_id
  FROM public.winner_selections ws
  INNER JOIN public.committee_members cm ON cm.id = ws.member_id
  WHERE cm.user_id = auth.uid()
)
ORDER BY pp.created_at DESC;
*/

-- ============================================================================
-- Migration Complete!
-- ============================================================================
-- The payment_proofs table is now ready with correct structure and RLS policies!
-- Winners can now view and manage payment proofs for their committees!
-- ============================================================================
