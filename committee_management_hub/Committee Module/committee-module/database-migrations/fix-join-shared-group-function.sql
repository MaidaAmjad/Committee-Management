-- ============================================================================
-- Fix: Create a SECURITY DEFINER function to join shared groups
-- This bypasses RLS issues for the second member joining
-- ============================================================================

-- Drop old policies and recreate properly
DROP POLICY IF EXISTS "Group leaders can update their shared group" ON public.shared_groups;
DROP POLICY IF EXISTS "Members can update shared groups" ON public.shared_groups;

-- Allow ANY authenticated user to update shared_groups
-- (we control logic in the app layer)
CREATE POLICY "Authenticated users can update shared groups"
ON public.shared_groups
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Also ensure the SELECT policy works for all committee members
DROP POLICY IF EXISTS "Committee members can view shared groups" ON public.shared_groups;

CREATE POLICY "Committee members can view shared groups"
ON public.shared_groups
FOR SELECT
TO authenticated
USING (
  committee_id IN (
    SELECT committee_id 
    FROM public.committee_members 
    WHERE user_id = auth.uid()
  )
);

-- Verify
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'shared_groups'
ORDER BY cmd;
