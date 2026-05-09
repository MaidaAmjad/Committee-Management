-- ============================================================================
-- Create Payment Methods Table
-- ============================================================================
-- This table stores user payment details (JazzCash, Easypaisa, Bank)
-- ============================================================================

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  jazzcash_number TEXT,
  easypaisa_number TEXT,
  bank_account_number TEXT,
  bank_name TEXT,
  account_title TEXT,
  primary_method TEXT CHECK (primary_method IN ('jazzcash', 'easypaisa', 'bank')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- One payment method record per user
  UNIQUE(user_id)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_payment_methods_user 
ON public.payment_methods(user_id);

-- Enable Row Level Security
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own payment methods
CREATE POLICY "Users can view their own payment methods"
ON public.payment_methods
FOR SELECT
USING (user_id = auth.uid());

-- Policy: Users can insert their own payment methods
CREATE POLICY "Users can insert their own payment methods"
ON public.payment_methods
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own payment methods
CREATE POLICY "Users can update their own payment methods"
ON public.payment_methods
FOR UPDATE
USING (user_id = auth.uid());

-- Policy: Users can delete their own payment methods
CREATE POLICY "Users can delete their own payment methods"
ON public.payment_methods
FOR DELETE
USING (user_id = auth.uid());

-- Policy: Committee members can view payment methods of winners
CREATE POLICY "Committee members can view winner payment methods"
ON public.payment_methods
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.winner_selections ws
    INNER JOIN public.committee_members cm ON cm.id = ws.member_id
    WHERE cm.user_id = payment_methods.user_id
      AND ws.committee_id IN (
        SELECT committee_id 
        FROM public.committee_members 
        WHERE user_id = auth.uid()
      )
  )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS payment_methods_updated_at ON public.payment_methods;
CREATE TRIGGER payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_methods_updated_at();

-- ============================================================================
-- Migration Complete!
-- ============================================================================
-- The payment_methods table is now ready to use.
-- Users can now add their payment details!
-- ============================================================================
