-- Fix existing committees: set duration_months = max_members
-- (Duration should equal number of members — 1 month per member)
UPDATE public.committees
SET duration_months = max_members
WHERE duration_months != max_members;

-- Verify
SELECT name, max_members, duration_months 
FROM committees 
ORDER BY created_at DESC;
