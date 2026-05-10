-- ============================================================================
-- Create Shared Groups Table
-- ============================================================================
-- This table stores shared group information for committee members
-- who share a single slot (0.5 + 0.5 = 1.0 slot)
-- ============================================================================

-- Create shared_groups table
CREATE TABLE IF NOT EXISTS public.shared_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID NOT NULL REFERENCES public.committees(id) ON DELETE CASCADE,
  group_leader_member_id UUID NOT NULL REFERENCES public.committee_members(id) ON DELETE CASCADE,
  group_member_member_id UUID REFERENCES public.committee_members(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_shared_groups_committee 
ON public.shared_groups(committee_id);

CREATE INDEX IF NOT EXISTS idx_shared_groups_leader 
ON public.shared_groups(group_leader_member_id);

CREATE INDEX IF NOT EXISTS idx_shared_groups_member 
ON public.shared_groups(group_member_member_id);

-- Enable RLS
ALTER TABLE public.shared_groups ENABLE ROW LEVEL SECURITY;

-- Policy: Committee members can view shared groups in their committee
CREATE POLICY "Committee members can view shared groups"
ON public.shared_groups
FOR SELECT
USING (
  committee_id IN (
    SELECT committee_id 
    FROM public.committee_members 
    WHERE user_id = auth.uid()
  )
);

-- Policy: Group leader can update their shared group
CREATE POLICY "Group leaders can update their shared group"
ON public.shared_groups
FOR UPDATE
USING (
  group_leader_member_id IN (
    SELECT id 
    FROM public.committee_members 
    WHERE user_id = auth.uid()
  )
);

-- Policy: Users can create shared groups
CREATE POLICY "Users can create shared groups"
ON public.shared_groups
FOR INSERT
WITH CHECK (
  group_leader_member_id IN (
    SELECT id 
    FROM public.committee_members 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- Update winner_selections table to support shared groups
-- ============================================================================

-- Add columns for shared group support
ALTER TABLE public.winner_selections 
ADD COLUMN IF NOT EXISTS is_shared_group BOOLEAN DEFAULT FALSE;

ALTER TABLE public.winner_selections 
ADD COLUMN IF NOT EXISTS shared_group_id UUID REFERENCES public.shared_groups(id);

ALTER TABLE public.winner_selections 
ADD COLUMN IF NOT EXISTS shared_group_member_ids UUID[];

ALTER TABLE public.winner_selections 
ADD COLUMN IF NOT EXISTS payment_details_user_id UUID REFERENCES auth.users(id);

-- Add comment
COMMENT ON COLUMN public.winner_selections.is_shared_group IS 'True if winner is a shared group (2 members)';
COMMENT ON COLUMN public.winner_selections.shared_group_id IS 'Reference to shared_groups table if applicable';
COMMENT ON COLUMN public.winner_selections.shared_group_member_ids IS 'Array of both member IDs in shared group';
COMMENT ON COLUMN public.winner_selections.payment_details_user_id IS 'User ID whose payment details should be shown (group leader for shared groups)';

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to get shared group for a member
CREATE OR REPLACE FUNCTION get_shared_group_for_member(
  p_committee_id UUID,
  p_member_id UUID
)
RETURNS TABLE (
  id UUID,
  group_leader_member_id UUID,
  group_member_member_id UUID,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sg.id,
    sg.group_leader_member_id,
    sg.group_member_member_id,
    sg.status
  FROM public.shared_groups sg
  WHERE sg.committee_id = p_committee_id
    AND (sg.group_leader_member_id = p_member_id 
         OR sg.group_member_member_id = p_member_id)
    AND sg.status = 'active'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check table structure
/*
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'shared_groups'
ORDER BY ordinal_position;
*/

-- Check winner_selections new columns
/*
SELECT 
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_name = 'winner_selections'
  AND column_name IN ('is_shared_group', 'shared_group_id', 'shared_group_member_ids', 'payment_details_user_id');
*/

-- Test query: Get shared group for a member
/*
SELECT * FROM get_shared_group_for_member(
  'YOUR_COMMITTEE_ID'::UUID,
  'YOUR_MEMBER_ID'::UUID
);
*/

-- ============================================================================
-- Migration Complete!
-- ============================================================================
-- The shared_groups table is now ready!
-- Winner selections can now track shared group winners!
-- ============================================================================
