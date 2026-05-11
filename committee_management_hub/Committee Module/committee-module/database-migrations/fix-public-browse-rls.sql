-- ============================================================================
-- Allow public (unauthenticated) read access to committees for guest browsing
-- ============================================================================

-- Allow anyone (including guests) to read committees
DROP POLICY IF EXISTS "Public can view committees" ON public.committees;
CREATE POLICY "Public can view committees"
ON public.committees FOR SELECT
TO anon, authenticated
USING (true);

-- Allow anyone to read committee_members count (for display)
DROP POLICY IF EXISTS "Public can view committee members" ON public.committee_members;
CREATE POLICY "Public can view committee members"
ON public.committee_members FOR SELECT
TO anon, authenticated
USING (true);

-- Allow anyone to read profiles (for member display)
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;
CREATE POLICY "Public can view profiles"
ON public.profiles FOR SELECT
TO anon, authenticated
USING (true);

SELECT 'Public browse access enabled!' AS status;
