-- ============================================================================
-- DATABASE MIGRATION: Add Shared Slot Support
-- ============================================================================
-- Run this in Supabase SQL Editor to enable shared committee slots
-- ============================================================================

-- Step 1: Add slot_type column (REQUIRED)
-- ----------------------------------------------------------------------------
ALTER TABLE committee_members 
ADD COLUMN IF NOT EXISTS slot_type VARCHAR(10) DEFAULT 'full';

-- Step 2: Update existing records to have slot_type = 'full'
-- ----------------------------------------------------------------------------
UPDATE committee_members 
SET slot_type = 'full' 
WHERE slot_type IS NULL;

-- Step 3: Add check constraint to ensure valid slot_type values
-- ----------------------------------------------------------------------------
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_slot_type'
  ) THEN
    ALTER TABLE committee_members
    ADD CONSTRAINT check_slot_type 
    CHECK (slot_type IN ('full', 'shared'));
  END IF;
END $$;

-- Step 4: Add shared_group_id column (OPTIONAL - for future use)
-- ----------------------------------------------------------------------------
ALTER TABLE committee_members 
ADD COLUMN IF NOT EXISTS shared_group_id UUID;

-- Step 5: Add index for performance
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_committee_members_slot_type 
ON committee_members(committee_id, slot_type, status);

-- ============================================================================
-- VERIFICATION - Check if migration was successful
-- ============================================================================

-- 1. Verify columns exist
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'committee_members'
AND column_name IN ('slot_type', 'shared_group_id')
ORDER BY column_name;

-- 2. Check all members have slot_type set
SELECT 
  COUNT(*) as total_members,
  COUNT(CASE WHEN slot_type = 'full' THEN 1 END) as full_members,
  COUNT(CASE WHEN slot_type = 'shared' THEN 1 END) as shared_members,
  COUNT(CASE WHEN slot_type IS NULL THEN 1 END) as null_slot_types
FROM committee_members;

-- 3. View slot usage per committee
SELECT 
  c.id,
  c.name,
  c.max_members,
  COUNT(cm.id) as member_count,
  SUM(CASE 
    WHEN cm.slot_type = 'shared' THEN 0.5 
    ELSE 1 
  END) as slots_used,
  c.max_members - SUM(CASE 
    WHEN cm.slot_type = 'shared' THEN 0.5 
    ELSE 1 
  END) as slots_remaining
FROM committees c
LEFT JOIN committee_members cm ON c.id = cm.committee_id AND cm.status = 'approved'
GROUP BY c.id, c.name, c.max_members
ORDER BY c.created_at DESC
LIMIT 10;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
-- If you see results from the verification queries above, the migration
-- was successful! Now refresh your browser to see the updated slot counts.
-- ============================================================================
