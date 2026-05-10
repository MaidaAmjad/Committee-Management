-- ============================================================================
-- Add Winner Access to Payment Proofs
-- ============================================================================
-- This migration adds RLS policy to allow current winners to view all
-- payment proofs for their committee
-- ============================================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Current winners can view all payment proofs for their committee" 
ON payment_proofs;

-- Create policy: Current winners can view all payment proofs
CREATE POLICY "Current winners can view all payment proofs for their committee"
ON payment_proofs
FOR SELECT
USING (
  -- Check if current user is the winner for this committee
  EXISTS (
    SELECT 1
    FROM winner_selections ws
    INNER JOIN committee_members cm ON cm.id = ws.member_id
    WHERE ws.committee_id = payment_proofs.committee_id
      AND cm.user_id = auth.uid()
      AND ws.id = (
        -- Get the most recent winner for this committee
        SELECT id 
        FROM winner_selections 
        WHERE committee_id = payment_proofs.committee_id
        ORDER BY created_at DESC 
        LIMIT 1
      )
  )
);

-- Also allow winners to update payment proof status (accept/reject)
DROP POLICY IF EXISTS "Current winners can update payment proof status" 
ON payment_proofs;

CREATE POLICY "Current winners can update payment proof status"
ON payment_proofs
FOR UPDATE
USING (
  -- Check if current user is the winner for this committee
  EXISTS (
    SELECT 1
    FROM winner_selections ws
    INNER JOIN committee_members cm ON cm.id = ws.member_id
    WHERE ws.committee_id = payment_proofs.committee_id
      AND cm.user_id = auth.uid()
      AND ws.id = (
        -- Get the most recent winner for this committee
        SELECT id 
        FROM winner_selections 
        WHERE committee_id = payment_proofs.committee_id
        ORDER BY created_at DESC 
        LIMIT 1
      )
  )
);

-- ============================================================================
-- Verification Query
-- ============================================================================
-- Run this to verify the policies were created:
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

-- ============================================================================
-- Test Query (Run as Winner)
-- ============================================================================
-- This should return all payment proofs for committees where you are the winner:
/*
SELECT 
  pp.id,
  pp.committee_id,
  pp.uploader_name,
  pp.file_name,
  pp.status,
  pp.created_at
FROM payment_proofs pp
WHERE pp.committee_id IN (
  SELECT ws.committee_id
  FROM winner_selections ws
  INNER JOIN committee_members cm ON cm.id = ws.member_id
  WHERE cm.user_id = auth.uid()
    AND ws.id = (
      SELECT id 
      FROM winner_selections 
      WHERE committee_id = ws.committee_id
      ORDER BY created_at DESC 
      LIMIT 1
    )
)
ORDER BY pp.created_at DESC;
*/

-- ============================================================================
-- Migration Complete!
-- ============================================================================
-- Winners can now view and manage payment proofs for their committees!
-- ============================================================================
