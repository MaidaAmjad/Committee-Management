-- ============================================================================
-- QUICK FIX: Add distribution_method column to committees table
-- ============================================================================
-- This is a minimal fix to get committee creation working again
-- For full winner selection features, run: winner-selection-system.sql
-- ============================================================================

-- Add distribution_method column if it doesn't exist
ALTER TABLE committees 
ADD COLUMN IF NOT EXISTS distribution_method TEXT DEFAULT 'random';

-- Add check constraint to ensure valid values
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'committees_distribution_method_check'
  ) THEN
    ALTER TABLE committees 
    ADD CONSTRAINT committees_distribution_method_check 
    CHECK (distribution_method IN ('random', 'manual'));
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN committees.distribution_method IS 'Winner selection method: random (automatic) or manual (admin selects)';

-- Verify the column was added
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'committees'
AND column_name = 'distribution_method';

-- ============================================================================
-- DONE! Committee creation should now work.
-- ============================================================================
-- Next steps:
-- 1. Refresh your browser (F5)
-- 2. Try creating a committee again
-- 3. For full winner selection features, run: winner-selection-system.sql
-- ============================================================================
