-- ============================================================================
-- Create Winner Selections Table
-- ============================================================================
-- This table stores the winner selection records for each committee cycle
-- ============================================================================

-- Create winner_selections table
CREATE TABLE IF NOT EXISTS public.winner_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID NOT NULL REFERENCES public.committees(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.committee_members(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  member_email TEXT NOT NULL,
  cycle_number INTEGER NOT NULL DEFAULT 1,
  selected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  selection_method TEXT NOT NULL CHECK (selection_method IN ('random', 'manual')),
  selected_by TEXT NOT NULL, -- user_id of admin or 'system' for random
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one winner per cycle per committee
  UNIQUE(committee_id, cycle_number)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_winner_selections_committee 
ON public.winner_selections(committee_id);

CREATE INDEX IF NOT EXISTS idx_winner_selections_member 
ON public.winner_selections(member_id);

CREATE INDEX IF NOT EXISTS idx_winner_selections_cycle 
ON public.winner_selections(committee_id, cycle_number);

-- Enable Row Level Security
ALTER TABLE public.winner_selections ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view winner selections for committees they're part of
CREATE POLICY "Users can view winner selections for their committees"
ON public.winner_selections
FOR SELECT
USING (
  committee_id IN (
    SELECT committee_id 
    FROM public.committee_members 
    WHERE user_id = auth.uid()
  )
);

-- Policy: Only committee admins can insert winner selections
CREATE POLICY "Committee admins can insert winner selections"
ON public.winner_selections
FOR INSERT
WITH CHECK (
  committee_id IN (
    SELECT id 
    FROM public.committees 
    WHERE created_by = auth.uid()
  )
);

-- Policy: Only committee admins can update winner selections
CREATE POLICY "Committee admins can update winner selections"
ON public.winner_selections
FOR UPDATE
USING (
  committee_id IN (
    SELECT id 
    FROM public.committees 
    WHERE created_by = auth.uid()
  )
);

-- Policy: Only committee admins can delete winner selections
CREATE POLICY "Committee admins can delete winner selections"
ON public.winner_selections
FOR DELETE
USING (
  committee_id IN (
    SELECT id 
    FROM public.committees 
    WHERE created_by = auth.uid()
  )
);

-- ============================================================================
-- Migration Complete!
-- ============================================================================
-- The winner_selections table is now ready to use.
-- You can now select winners for your committees!
-- ============================================================================
