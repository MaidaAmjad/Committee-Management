-- ============================================================================
-- Winner Selection System Database Migration
-- ============================================================================
-- This migration adds support for committee winner distribution methods
-- (random and manual selection) with winner tracking and payment details
-- ============================================================================

-- 1. Add distribution_method column to committees table
-- ============================================================================
ALTER TABLE committees 
ADD COLUMN IF NOT EXISTS distribution_method TEXT DEFAULT 'random' CHECK (distribution_method IN ('random', 'manual'));

COMMENT ON COLUMN committees.distribution_method IS 'Winner selection method: random (automatic) or manual (admin selects)';

-- 2. Create winner_selections table
-- ============================================================================
CREATE TABLE IF NOT EXISTS winner_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID NOT NULL REFERENCES committees(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES committee_members(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  member_email TEXT NOT NULL,
  cycle_number INTEGER NOT NULL,
  selected_at TIMESTAMPTZ DEFAULT NOW(),
  selection_method TEXT NOT NULL CHECK (selection_method IN ('random', 'manual')),
  selected_by TEXT NOT NULL, -- user_id of admin or 'system' for random
  
  -- Constraints
  UNIQUE(committee_id, cycle_number), -- One winner per cycle
  UNIQUE(committee_id, member_id), -- Each member can only win once per committee
  CHECK (cycle_number > 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_winner_selections_committee ON winner_selections(committee_id);
CREATE INDEX IF NOT EXISTS idx_winner_selections_member ON winner_selections(member_id);
CREATE INDEX IF NOT EXISTS idx_winner_selections_cycle ON winner_selections(committee_id, cycle_number);

-- Comments
COMMENT ON TABLE winner_selections IS 'Tracks committee winners for each cycle/month';
COMMENT ON COLUMN winner_selections.committee_id IS 'Reference to the committee';
COMMENT ON COLUMN winner_selections.member_id IS 'Reference to the winning committee member';
COMMENT ON COLUMN winner_selections.cycle_number IS 'Cycle/month number (1, 2, 3, etc.)';
COMMENT ON COLUMN winner_selections.selection_method IS 'How winner was selected: random or manual';
COMMENT ON COLUMN winner_selections.selected_by IS 'User ID of admin who selected (or "system" for random)';

-- 3. Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE winner_selections ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view winner selections for committees they are members of
CREATE POLICY "Members can view winner selections"
  ON winner_selections
  FOR SELECT
  USING (
    committee_id IN (
      SELECT committee_id 
      FROM committee_members 
      WHERE user_id = auth.uid() 
      AND status = 'approved'
    )
  );

-- Policy: Committee owners can insert winner selections
CREATE POLICY "Committee owners can insert winner selections"
  ON winner_selections
  FOR INSERT
  WITH CHECK (
    committee_id IN (
      SELECT id 
      FROM committees 
      WHERE created_by = auth.uid()
    )
  );

-- Policy: Committee owners can view all winner selections for their committees
CREATE POLICY "Committee owners can view all winner selections"
  ON winner_selections
  FOR SELECT
  USING (
    committee_id IN (
      SELECT id 
      FROM committees 
      WHERE created_by = auth.uid()
    )
  );

-- 4. Helper Functions
-- ============================================================================

-- Function to get eligible members for winner selection
CREATE OR REPLACE FUNCTION get_eligible_members(p_committee_id UUID)
RETURNS TABLE (
  member_id UUID,
  user_id UUID,
  full_name TEXT,
  email TEXT,
  slot_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.id AS member_id,
    cm.user_id,
    cm.full_name,
    cm.email,
    cm.slot_type
  FROM committee_members cm
  WHERE cm.committee_id = p_committee_id
    AND cm.status = 'approved'
    AND cm.id NOT IN (
      SELECT ws.member_id 
      FROM winner_selections ws 
      WHERE ws.committee_id = p_committee_id
    )
  ORDER BY cm.joined_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_eligible_members IS 'Returns approved members who have not won yet for a committee';

-- Function to get current cycle winner
CREATE OR REPLACE FUNCTION get_current_winner(p_committee_id UUID)
RETURNS TABLE (
  id UUID,
  committee_id UUID,
  member_id UUID,
  member_name TEXT,
  member_email TEXT,
  cycle_number INTEGER,
  selected_at TIMESTAMPTZ,
  selection_method TEXT,
  selected_by TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ws.id,
    ws.committee_id,
    ws.member_id,
    ws.member_name,
    ws.member_email,
    ws.cycle_number,
    ws.selected_at,
    ws.selection_method,
    ws.selected_by
  FROM winner_selections ws
  WHERE ws.committee_id = p_committee_id
  ORDER BY ws.cycle_number DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_current_winner IS 'Returns the most recent winner for a committee';

-- 5. Sample Data (Optional - for testing)
-- ============================================================================
-- Uncomment below to add sample data for testing

/*
-- Update existing committees to have distribution method
UPDATE committees 
SET distribution_method = 'random' 
WHERE distribution_method IS NULL;

-- Example: Insert a sample winner selection
-- INSERT INTO winner_selections (
--   committee_id,
--   member_id,
--   member_name,
--   member_email,
--   cycle_number,
--   selection_method,
--   selected_by
-- ) VALUES (
--   'your-committee-id',
--   'your-member-id',
--   'John Doe',
--   'john@example.com',
--   1,
--   'random',
--   'system'
-- );
*/

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- The winner selection system is now ready to use!
-- 
-- Features added:
-- 1. Distribution method selection (random/manual) for committees
-- 2. Winner tracking with cycle numbers
-- 3. Automatic prevention of duplicate winners
-- 4. RLS policies for secure access
-- 5. Helper functions for eligible members and current winner
-- ============================================================================
