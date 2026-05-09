-- ============================================================================
-- Auto Winner Selection & Payment Details Display Fix
-- ============================================================================
-- This fixes the system to:
-- 1. Show owner's payment details when committee starts
-- 2. Auto-select random winner when payment is approved
-- 3. Display winner's payment details
-- 4. Send notification to selected winner
-- ============================================================================

-- 1. Function to auto-select random next winner when payment approved
-- ============================================================================
CREATE OR REPLACE FUNCTION auto_select_next_winner()
RETURNS TRIGGER AS $$
DECLARE
  v_committee RECORD;
  v_current_cycle INTEGER;
  v_eligible_members UUID[];
  v_random_member RECORD;
  v_next_cycle INTEGER;
BEGIN
  -- Only proceed if payment was just approved
  IF NEW.status != 'approved' OR OLD.status = 'approved' THEN
    RETURN NEW;
  END IF;
  
  -- Get committee details
  SELECT * INTO v_committee 
  FROM committees 
  WHERE id = NEW.committee_id;
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  v_current_cycle := COALESCE(v_committee.current_cycle, 0);
  
  -- Check if all members have submitted and been approved for current cycle
  DECLARE
    v_total_members INTEGER;
    v_approved_proofs INTEGER;
  BEGIN
    SELECT COUNT(*) INTO v_total_members
    FROM committee_members
    WHERE committee_id = NEW.committee_id
      AND status = 'approved';
    
    SELECT COUNT(DISTINCT user_id) INTO v_approved_proofs
    FROM payment_proofs
    WHERE committee_id = NEW.committee_id
      AND cycle_number = v_current_cycle
      AND status = 'approved';
    
    -- If not all members have paid, don't advance yet
    IF v_approved_proofs < v_total_members THEN
      RETURN NEW;
    END IF;
  END;
  
  -- All members have paid! Select random next winner
  
  -- Get eligible members (haven't won yet)
  SELECT ARRAY_AGG(cm.id) INTO v_eligible_members
  FROM committee_members cm
  WHERE cm.committee_id = NEW.committee_id
    AND cm.status = 'approved'
    AND cm.id NOT IN (
      SELECT winner_member_id 
      FROM committee_cycles 
      WHERE committee_id = NEW.committee_id 
        AND winner_member_id IS NOT NULL
    );
  
  -- If no eligible members, committee is complete
  IF v_eligible_members IS NULL OR array_length(v_eligible_members, 1) = 0 THEN
    UPDATE committees
    SET status = 'Completed'
    WHERE id = NEW.committee_id;
    RETURN NEW;
  END IF;
  
  -- Select random member from eligible list
  SELECT cm.* INTO v_random_member
  FROM committee_members cm
  WHERE cm.id = v_eligible_members[1 + floor(random() * array_length(v_eligible_members, 1))::int];
  
  v_next_cycle := v_current_cycle + 1;
  
  -- Complete current cycle
  UPDATE committee_cycles
  SET status = 'completed', completed_at = NOW()
  WHERE committee_id = NEW.committee_id
    AND cycle_number = v_current_cycle;
  
  -- Create next cycle with random winner
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
    NEW.committee_id,
    v_next_cycle,
    v_random_member.id,
    v_random_member.user_id,
    v_random_member.full_name,
    CURRENT_DATE,
    CURRENT_DATE + (v_committee.payment_cycle_days || ' days')::INTERVAL,
    CURRENT_DATE + (v_committee.payment_cycle_days || ' days')::INTERVAL,
    'active'
  );
  
  -- Update committee
  UPDATE committees
  SET 
    current_cycle = v_next_cycle,
    next_cycle_date = CURRENT_DATE + (payment_cycle_days || ' days')::INTERVAL
  WHERE id = NEW.committee_id;
  
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
    NEW.committee_id,
    v_random_member.id,
    v_random_member.full_name,
    v_random_member.email,
    v_next_cycle,
    'random',
    'system'
  );
  
  -- Send announcement to all members
  INSERT INTO committee_messages (
    committee_id,
    sender_id,
    sender_name,
    message
  ) VALUES (
    NEW.committee_id,
    v_committee.created_by,
    '🎉 Committee System',
    'Cycle ' || v_next_cycle || ' has started! 🎊 Congratulations to ' || v_random_member.full_name || '! You have been randomly selected as the winner for this cycle. Please check your payment details in the committee page. All members should submit their payment proof.'
  );
  
  -- Send personal notification to winner
  INSERT INTO committee_messages (
    committee_id,
    sender_id,
    sender_name,
    message
  ) VALUES (
    NEW.committee_id,
    v_committee.created_by,
    '🏆 Personal Notification',
    'Congratulations ' || v_random_member.full_name || '! You are the winner of Cycle ' || v_next_cycle || '. You will receive the committee amount once all members submit their payments. Your payment details are now visible to all members.'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_auto_select_winner ON payment_proofs;

-- Create trigger on payment_proofs
CREATE TRIGGER trigger_auto_select_winner
  AFTER UPDATE ON payment_proofs
  FOR EACH ROW
  EXECUTE FUNCTION auto_select_next_winner();

-- 2. Function to get current winner's payment details
-- ============================================================================
CREATE OR REPLACE FUNCTION get_current_winner_payment_details(p_committee_id UUID)
RETURNS TABLE (
  winner_user_id UUID,
  winner_name TEXT,
  cycle_number INTEGER,
  jazzcash_number TEXT,
  easypaisa_number TEXT,
  bank_account_number TEXT,
  bank_name TEXT,
  account_title TEXT,
  primary_method TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.winner_user_id,
    cc.winner_name,
    cc.cycle_number,
    pm.jazzcash_number,
    pm.easypaisa_number,
    pm.bank_account_number,
    pm.bank_name,
    pm.account_title,
    pm.primary_method
  FROM committee_cycles cc
  LEFT JOIN payment_methods pm ON pm.user_id = cc.winner_user_id
  WHERE cc.committee_id = p_committee_id
    AND cc.status = 'active'
  ORDER BY cc.cycle_number DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update initialize_first_cycle to ensure owner's payment details are shown
-- ============================================================================
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
    next_cycle_date = CURRENT_DATE + (payment_cycle_days || ' days')::INTERVAL,
    status = 'Active'
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
    'Committee "' || v_committee.name || '" has started! 🎊 Cycle 1 winner is ' || v_admin_member.full_name || ' (Committee Owner). All members should submit their payment proof by ' || v_committee.payment_deadline_date || '. The owner''s payment details are now visible to all members.'
  );
  
  -- Send personal notification to owner
  INSERT INTO committee_messages (
    committee_id,
    sender_id,
    sender_name,
    message
  ) VALUES (
    p_committee_id,
    v_committee.created_by,
    '🏆 Personal Notification',
    'Congratulations! As the committee owner, you are the winner of Cycle 1. Your payment details are now visible to all members. You will receive the committee amount once all members submit their payments.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Add index for better performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_payment_proofs_committee_cycle_status 
ON payment_proofs(committee_id, cycle_number, status);

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Changes made:
-- 1. ✅ Auto-select random winner when all payments approved
-- 2. ✅ Display winner's payment details automatically
-- 3. ✅ Send notification to selected winner
-- 4. ✅ Show owner's payment details in Cycle 1
-- 5. ✅ Automatic cycle progression
-- ============================================================================
