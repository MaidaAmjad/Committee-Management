-- ============================================================================
-- Fix Shared Groups RLS Policies
-- ============================================================================
-- Problem 1: UPDATE policy only allows group leaders to update,
--            but the second member also needs to update when joining.
-- Problem 2: The update silently fails (no error shown to user).
-- ============================================================================

-- Drop the old restrictive UPDATE policy
DROP POLICY IF EXISTS "Group leaders can update their shared group" ON public.shared_groups;

-- New UPDATE policy: Allow both leaders AND any shared member of the committee
CREATE POLICY "Members can update shared groups"
ON public.shared_groups
FOR UPDATE
USING (
  -- Allow if user is the group leader
  group_leader_member_id IN (
    SELECT id FROM public.committee_members WHERE user_id = auth.uid()
  )
  OR
  -- Allow if user is a shared slot member of this committee (second member joining)
  committee_id IN (
    SELECT committee_id FROM public.committee_members 
    WHERE user_id = auth.uid() AND slot_type = 'shared'
  )
);

-- Verify all policies on shared_groups
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'shared_groups'
ORDER BY cmd;
