-- ============================================================================
-- Committee Cycle Management System
-- ============================================================================
-- Features:
-- 1. Auto-assign admin as first winner when committee is created
-- 2. Track payment proof submissions
-- 3. Manage cycle progression
-- 4. Show next winner and countdown
-- 5. Display current winner's payment details
-- ============================================================================

-- 1. Create payment_proofs table
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID NOT NULL REFERENCES committees(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_number INTEGER NOT NULL,
  proof_image_url TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Constraints
  UNIQUE(committee_id, user_id, cycle_number),
  CHECK (cycle_number > 0),
  CHECK (amount > 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_proofs_committee ON payment_proofs(committee_id);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_user ON payment_proofs(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_status ON payment_proofs(status);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_cycle ON payment_proofs(committee_id, cycle_number);

-- Comments
COMMENT ON TABLE payment_proofs IS 'Tracks member payment proof submissions for each cycle';
COMMENT ON COLUMN payment_proofs.status IS 'pending, approved, or rejected';
COMMENT ON COLUMN payment_proofs.cycle_number IS 'Which cycle/month this payment is for';

-- 2. Create committee_cycles table
-- ============================================================================
CREATE TABLE IF NOT EXISTS committee_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID NOT NULL REFERENCES committees(id) ON DELETE CASCADE,
  cycle_number INTEGER NOT NULL,
  winner_member_id UUID REFERENCES committee_members(id),
  winner_user_id UUID REFERENCES auth.users(id),
  winner_name TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  payment_deadline DATE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Constraints
  UNIQUE(committee_id, cycle_number),
  CHECK (cycle_number > 0),
  CHECK (end_date > start_date),
  CHECK (payment_deadline >= start_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_committee_cycles_committee ON committee_cycles(committee_id);
CREATE INDEX IF NOT EXISTS idx_committee_cycles_status ON committee_cycles(status);
CREATE INDEX IF NOT EXISTS idx_committee_cycles_winner ON committee_cycles(winner_member_id);

-- Comments
COMMENT ON TABLE committee_cycles IS 'Tracks each cycle/month of a committee';
COMMENT ON COLUMN committee_cycles.status IS 'pending, active, completed, or cancelled';

-- 3. Add cycle tracking columns to committees table
-- ============================================================================
ALTER TABLE committees 
ADD COLUMN IF NOT EXISTS current_cycle INTEGER DEFAULT 0;

ALTER TABLE committees 
ADD COLUMN IF NOT EXISTS cycle_start_date DATE;

ALTER TABLE committees 
ADD COLUMN IF NOT EXISTS next_cycle_date DATE;

COMMENT ON COLUMN committees.current_cycle IS 'Current active cycle number (0 = not started)';
COMMENT ON COLUMN committees.cycle_start_date IS 'When the first cycle started';
COMMENT ON COLUMN committees.next_cycle_date IS 'When the next cycle will start';

-- 4. Row Level Security Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE payment_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE committee_cycles ENABLE ROW LEVEL SECURITY;

-- Payment Proofs Policies
CREATE POLICY "Users can view their own payment proofs"
  ON payment_proofs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Committee owners can view all payment proofs"
  ON payment_proofs FOR SELECT
  USING (
    committee_id IN (
      SELECT id FROM committees WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Committee members can view payment proofs for their committees"
  ON payment_proofs FOR SELECT
  USING (
    committee_id IN (
      SELECT committee_id FROM committee_members 
      WHERE user_id = auth.uid() AND status = 'approved'
    )
  );

CREATE POLICY "Users can submit their own payment proofs"
  ON payment_proofs FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Committee owners can update payment proof status"
  ON payment_proofs FOR UPDATE
  USING (
    committee_id IN (
      SELECT id FROM committees WHERE created_by = auth.uid()
    )
  );

-- Committee Cycles Policies
CREATE POLICY "Committee members can view cycles"
  ON committee_cycles FOR SELECT
  USING (
    committee_id IN (
      SELECT committee_id FROM committee_members 
      WHERE user_id = auth.uid() AND status = 'approved'
    )
  );

CREATE POLICY "Committee owners can manage cycles"
  ON committee_cycles FOR ALL
  USING (
    committee_id IN (
      SELECT id FROM committees WHERE created_by = auth.uid()
    )
  );

-- 5. Helper Functions
-- ============================================================================

-- Function to initialize first cycle with admin as winner
CREATE OR REPLACE FUNCTION initialize_first_cycle(p_committee_id UUID)
RETURNS VOID AS $$
DECLARE
  v_committee RECORD;
  v_admin_member RECORD;
BEGIN
  -- Get committee details
  SELECT * INTO v_committee FROM committees WHERE id = p_committee_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Committee not found';
  END IF;
  
  -- Get admin member record
  SELECT * INTO v_admin_member 
  FROM committee_members 
  WHERE committee_id = p_committee_id 
    AND user_id = v_committee.created_by 
    AND status = 'approved'
  LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Admin member not found';
  END IF;
  
  -- Create first cycle with admin as winner
  INSERT INTO committee_cycles (
    committee_id,
    cycle_number,
    winner_member_id,
    winner_user_id,
    winner_name,
    start_date,
    end_date,
    payment_deadline,
    status
  ) VALUES (
    p_committee_id,
    1,
    v_admin_member.id,
    v_admin_member.user_id,
    v_admin_member.full_name,
    CURRENT_DATE,
    CURRENT_DATE + (v_committee.payment_cycle_days || ' days')::INTERVAL,
    v_committee.payment_deadline_date,
    'active'
  )
  ON CONFLICT (committee_id, cycle_number) DO NOTHING;
  
  -- Update committee
  UPDATE committees 
  SET 
    current_cycle = 1,
    cycle_start_date = CURRENT_DATE,
    next_cycle_date = CURRENT_DATE + (payment_cycle_days || ' days')::INTERVAL
  WHERE id = p_committee_id;
  
  -- Create winner selection record
  INSERT INTO winner_selections (
    committee_id,
    member_id,
    member_name,
    member_email,
    cycle_number,
    selection_method,
    selected_by
  ) VALUES (
    p_committee_id,
    v_admin_member.id,
    v_admin_member.full_name,
    v_admin_member.email,
    1,
    'manual',
    v_committee.created_by
  )
  ON CONFLICT (committee_id, cycle_number) DO NOTHING;
  
  -- Send announcement
  INSERT INTO committee_messages (
    committee_id,
    sender_id,
    sender_name,
    message
  ) VALUES (
    p_committee_id,
    v_committee.created_by,
    '🎉 Committee System',
    'Committee has started! Cycle 1 winner is ' || v_admin_member.full_name || ' (Admin). All members should submit their payment proof by ' || v_committee.payment_deadline_date || '.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current cycle info
CREATE OR REPLACE FUNCTION get_current_cycle_info(p_committee_id UUID)
RETURNS TABLE (
  cycle_number INTEGER,
  winner_name TEXT,
  winner_user_id UUID,
  start_date DATE,
  end_date DATE,
  payment_deadline DATE,
  days_remaining INTEGER,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.cycle_number,
    cc.winner_name,
    cc.winner_user_id,
    cc.start_date,
    cc.end_date,
    cc.payment_deadline,
    (cc.end_date - CURRENT_DATE)::INTEGER AS days_remaining,
    cc.status
  FROM committee_cycles cc
  WHERE cc.committee_id = p_committee_id
    AND cc.status = 'active'
  ORDER BY cc.cycle_number DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get next winner
CREATE OR REPLACE FUNCTION get_next_winner(p_committee_id UUID)
RETURNS TABLE (
  member_id UUID,
  member_name TEXT,
  member_email TEXT,
  user_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.id AS member_id,
    cm.full_name AS member_name,
    cm.email AS member_email,
    cm.user_id
  FROM committee_members cm
  WHERE cm.committee_id = p_committee_id
    AND cm.status = 'approved'
    AND cm.id NOT IN (
      SELECT winner_member_id 
      FROM committee_cycles 
      WHERE committee_id = p_committee_id 
        AND winner_member_id IS NOT NULL
    )
  ORDER BY cm.joined_at
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has submitted payment proof for current cycle
CREATE OR REPLACE FUNCTION has_submitted_payment_proof(
  p_committee_id UUID,
  p_user_id UUID,
  p_cycle_number INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM payment_proofs
  WHERE committee_id = p_committee_id
    AND user_id = p_user_id
    AND cycle_number = p_cycle_number
    AND status = 'approved';
  
  RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to advance to next cycle
CREATE OR REPLACE FUNCTION advance_to_next_cycle(p_committee_id UUID)
RETURNS VOID AS $$
DECLARE
  v_committee RECORD;
  v_current_cycle INTEGER;
  v_next_winner RECORD;
BEGIN
  -- Get committee details
  SELECT * INTO v_committee FROM committees WHERE id = p_committee_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Committee not found';
  END IF;
  
  -- Get current cycle
  v_current_cycle := v_committee.current_cycle;
  
  -- Complete current cycle
  UPDATE committee_cycles
  SET status = 'completed', completed_at = NOW()
  WHERE committee_id = p_committee_id
    AND cycle_number = v_current_cycle;
  
  -- Get next winner
  SELECT * INTO v_next_winner FROM get_next_winner(p_committee_id);
  
  IF NOT FOUND THEN
    -- No more winners, committee is complete
    UPDATE committees
    SET status = 'Completed'
    WHERE id = p_committee_id;
    RETURN;
  END IF;
  
  -- Create next cycle
  INSERT INTO committee_cycles (
    committee_id,
    cycle_number,
    winner_member_id,
    winner_user_id,
    winner_name,
    start_date,
    end_date,
    payment_deadline,
    status
  ) VALUES (
    p_committee_id,
    v_current_cycle + 1,
    v_next_winner.member_id,
    v_next_winner.user_id,
    v_next_winner.member_name,
    CURRENT_DATE,
    CURRENT_DATE + (v_committee.payment_cycle_days || ' days')::INTERVAL,
    CURRENT_DATE + (v_committee.payment_cycle_days || ' days')::INTERVAL,
    'active'
  );
  
  -- Update committee
  UPDATE committees
  SET 
    current_cycle = v_current_cycle + 1,
    next_cycle_date = CURRENT_DATE + (payment_cycle_days || ' days')::INTERVAL
  WHERE id = p_committee_id;
  
  -- Create winner selection record
  INSERT INTO winner_selections (
    committee_id,
    member_id,
    member_name,
    member_email,
    cycle_number,
    selection_method,
    selected_by
  ) VALUES (
    p_committee_id,
    v_next_winner.member_id,
    v_next_winner.member_name,
    v_next_winner.member_email,
    v_current_cycle + 1,
    'automatic',
    'system'
  );
  
  -- Send announcement
  INSERT INTO committee_messages (
    committee_id,
    sender_id,
    sender_name,
    message
  ) VALUES (
    p_committee_id,
    v_committee.created_by,
    '🎉 Committee System',
    'Cycle ' || (v_current_cycle + 1) || ' has started! Winner is ' || v_next_winner.member_name || '. All members should submit their payment proof.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger to initialize first cycle when committee reaches max members
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_initialize_first_cycle()
RETURNS TRIGGER AS $$
DECLARE
  v_member_count INTEGER;
  v_max_members INTEGER;
  v_current_cycle INTEGER;
BEGIN
  -- Only for approved members
  IF NEW.status != 'approved' THEN
    RETURN NEW;
  END IF;
  
  -- Get committee details
  SELECT max_members, current_cycle INTO v_max_members, v_current_cycle
  FROM committees
  WHERE id = NEW.committee_id;
  
  -- Count approved members
  SELECT COUNT(*) INTO v_member_count
  FROM committee_members
  WHERE committee_id = NEW.committee_id
    AND status = 'approved';
  
  -- If committee is full and not started, initialize first cycle
  IF v_member_count >= v_max_members AND (v_current_cycle IS NULL OR v_current_cycle = 0) THEN
    PERFORM initialize_first_cycle(NEW.committee_id);
    
    -- Update committee status to Active
    UPDATE committees
    SET status = 'Active'
    WHERE id = NEW.committee_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_committee_full
  AFTER INSERT OR UPDATE ON committee_members
  FOR EACH ROW
  EXECUTE FUNCTION trigger_initialize_first_cycle();

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Features added:
-- 1. ✅ Payment proof tracking
-- 2. ✅ Committee cycle management
-- 3. ✅ Auto-assign admin as first winner
-- 4. ✅ Automatic cycle progression
-- 5. ✅ Next winner calculation
-- 6. ✅ Countdown and deadline tracking
-- 7. ✅ Payment proof approval workflow
-- 8. ✅ Announcements for cycle changes
-- ============================================================================
