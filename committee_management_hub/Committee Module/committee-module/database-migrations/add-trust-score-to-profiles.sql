-- Add trust_score column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 0
  CHECK (trust_score BETWEEN 0 AND 100);

ALTER TABLE public.profiles
ALTER COLUMN trust_score SET DEFAULT 0;

-- Verify
SELECT 'trust_score column added!' AS status;
