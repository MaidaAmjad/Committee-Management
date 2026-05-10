-- ============================================================================
-- Clear All Payment Proofs
-- ============================================================================
-- This script deletes all payment proof records from the database
-- Use this to reset payment proofs for testing or new cycle
-- ============================================================================

-- WARNING: This will delete ALL payment proofs for ALL committees!
-- Make sure you want to do this before running.

-- Delete all payment proofs
DELETE FROM public.payment_proofs;

-- Verify deletion
SELECT COUNT(*) as remaining_proofs FROM public.payment_proofs;

-- Expected result: remaining_proofs = 0

-- ============================================================================
-- Alternative: Delete proofs for specific committee only
-- ============================================================================
-- If you only want to delete proofs for ONE committee, use this instead:
/*
DELETE FROM public.payment_proofs 
WHERE committee_id = 'YOUR_COMMITTEE_ID_HERE';
*/

-- ============================================================================
-- Alternative: Delete proofs for specific month only
-- ============================================================================
-- If you only want to delete proofs for ONE month, use this instead:
/*
DELETE FROM public.payment_proofs 
WHERE month_year = '2026-05';
*/

-- ============================================================================
-- Alternative: Delete proofs for specific committee and month
-- ============================================================================
-- Most targeted deletion:
/*
DELETE FROM public.payment_proofs 
WHERE committee_id = 'YOUR_COMMITTEE_ID_HERE'
  AND month_year = '2026-05';
*/

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check remaining proofs by committee
/*
SELECT 
  committee_id,
  COUNT(*) as proof_count
FROM public.payment_proofs
GROUP BY committee_id;
*/

-- Check remaining proofs by month
/*
SELECT 
  month_year,
  COUNT(*) as proof_count
FROM public.payment_proofs
GROUP BY month_year
ORDER BY month_year DESC;
*/

-- Check all remaining proofs
/*
SELECT 
  id,
  committee_id,
  uploader_name,
  file_name,
  month_year,
  status,
  created_at
FROM public.payment_proofs
ORDER BY created_at DESC;
*/

-- ============================================================================
-- DONE!
-- ============================================================================
-- All payment proofs have been cleared!
-- Members can now upload new proofs.
-- ============================================================================
