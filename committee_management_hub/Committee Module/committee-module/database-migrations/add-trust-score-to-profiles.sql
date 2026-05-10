-- Add trust_score column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 95
  CHECK (trust_score BETWEEN 0 AND 100);

-- Verify
SELECT 'trust_score column added!' AS status;
