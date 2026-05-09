-- ============================================================================
-- DEBUG: Payment Methods Not Showing
-- ============================================================================
-- Run this script to diagnose why payment details aren't showing
-- ============================================================================

-- Step 1: Check if payment_methods table exists
SELECT 'Step 1: Payment Methods Table' as step;
SELECT COUNT(*) as total_records FROM public.payment_methods;
SELECT * FROM public.payment_methods;

-- Step 2: Check if winner_selections table has data
SELECT 'Step 2: Winner Selections' as step;
SELECT 
  id,
  committee_id,
  member_id,
  member_name,
  member_email,
  cycle_number,
  selection_method,
  created_at
FROM public.winner_selections 
ORDER BY created_at DESC 
LIMIT 5;

-- Step 3: Check committee_members table
SELECT 'Step 3: Committee Members' as step;
SELECT 
  id,
  committee_id,
  user_id,
  full_name,
  email,
  status
FROM public.committee_members
WHERE status = 'approved'
ORDER BY created_at DESC
LIMIT 10;

-- Step 4: Check the complete join (Winner → Member → Payment Details)
SELECT 'Step 4: Complete Winner Payment Details Join' as step;
SELECT 
  ws.member_name as winner_name,
  ws.member_email as winner_email,
  ws.cycle_number,
  cm.id as member_id,
  cm.user_id as member_user_id,
  pm.id as payment_method_id,
  pm.jazzcash_number,
  pm.easypaisa_number,
  pm.bank_account_number,
  pm.bank_name,
  pm.account_title,
  pm.primary_method,
  CASE 
    WHEN pm.id IS NULL THEN '❌ No payment methods record'
    WHEN pm.jazzcash_number IS NULL AND pm.easypaisa_number IS NULL AND pm.bank_account_number IS NULL THEN '⚠️ Payment methods exist but all fields are NULL'
    ELSE '✅ Payment methods exist with data'
  END as status
FROM public.winner_selections ws
JOIN public.committee_members cm ON cm.id = ws.member_id
LEFT JOIN public.payment_methods pm ON pm.user_id = cm.user_id
ORDER BY ws.created_at DESC
LIMIT 5;

-- Step 5: Check for Maida Amjad specifically
SELECT 'Step 5: Maida Amjad Payment Details' as step;
SELECT 
  u.id as user_id,
  u.email,
  pm.jazzcash_number,
  pm.easypaisa_number,
  pm.bank_account_number,
  pm.bank_name,
  pm.account_title,
  pm.primary_method,
  pm.created_at,
  CASE 
    WHEN pm.id IS NULL THEN '❌ No payment methods record - needs to add payment details'
    WHEN pm.jazzcash_number IS NULL AND pm.easypaisa_number IS NULL AND pm.bank_account_number IS NULL THEN '⚠️ Record exists but all payment fields are empty'
    ELSE '✅ Has payment details'
  END as status
FROM auth.users u
LEFT JOIN public.payment_methods pm ON pm.user_id = u.id
WHERE u.email ILIKE '%maida%' OR u.email ILIKE '%amjad%'
LIMIT 5;

-- Step 6: Check RLS policies
SELECT 'Step 6: RLS Policies on payment_methods' as step;
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'payment_methods';

-- ============================================================================
-- INTERPRETATION GUIDE
-- ============================================================================
-- 
-- Step 1: Should show all payment method records
--   - If empty: No one has added payment details yet
--   - If has records: Check if Maida's user_id is in the list
--
-- Step 2: Should show recent winners
--   - Check if Maida Amjad is listed as a winner
--   - Note the member_id
--
-- Step 3: Should show committee members
--   - Find Maida's member record
--   - Note her user_id
--
-- Step 4: THE MOST IMPORTANT CHECK
--   - This shows the complete join that the app uses
--   - If status shows "❌ No payment methods record":
--     → Maida needs to add payment details via Profile → Payment Methods
--   - If status shows "⚠️ Payment methods exist but all fields are NULL":
--     → Maida has a record but didn't fill in any payment details
--   - If status shows "✅ Payment methods exist with data":
--     → Payment details exist! Check RLS policies or app code
--
-- Step 5: Maida-specific check
--   - Shows if Maida has payment details in the database
--   - If no record: She needs to add payment details
--   - If record exists but fields are NULL: She needs to fill them in
--
-- Step 6: RLS Policies
--   - Should show policies allowing:
--     1. Users to view their own payment methods
--     2. Committee members to view winner payment methods
--   - If policies are missing, run create-payment-methods-table.sql again
--
-- ============================================================================

-- Step 7: Test if current user can see winner's payment details
SELECT 'Step 7: Test RLS - Can I see winner payment details?' as step;
SELECT 
  pm.*
FROM public.payment_methods pm
WHERE EXISTS (
  SELECT 1
  FROM public.winner_selections ws
  INNER JOIN public.committee_members cm ON cm.id = ws.member_id
  WHERE cm.user_id = pm.user_id
    AND ws.committee_id IN (
      SELECT committee_id 
      FROM public.committee_members 
      WHERE user_id = auth.uid()
    )
);

-- ============================================================================
-- QUICK FIX COMMANDS
-- ============================================================================

-- If Maida's record exists but fields are NULL, update them:
-- (Replace with actual values)
/*
UPDATE public.payment_methods
SET 
  jazzcash_number = '03001234567',
  easypaisa_number = '03009876543',
  bank_account_number = '1234567890123',
  bank_name = 'HBL',
  account_title = 'Maida Amjad',
  primary_method = 'jazzcash',
  updated_at = NOW()
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'maidaamjad32@gmail.com'
);
*/

-- If Maida has no record at all, insert one:
-- (Replace with actual values)
/*
INSERT INTO public.payment_methods (
  user_id,
  jazzcash_number,
  easypaisa_number,
  bank_account_number,
  bank_name,
  account_title,
  primary_method
)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'maidaamjad32@gmail.com'),
  '03001234567',
  '03009876543',
  '1234567890123',
  'HBL',
  'Maida Amjad',
  'jazzcash'
);
*/

-- ============================================================================
-- END OF DEBUG SCRIPT
-- ============================================================================
