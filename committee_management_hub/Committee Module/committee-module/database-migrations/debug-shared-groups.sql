-- Run these one by one and share results

-- 1. All shared groups
SELECT 
  sg.id,
  sg.status,
  sg.group_leader_member_id,
  sg.group_member_member_id,
  sg.committee_id
FROM shared_groups sg;

-- 2. All shared committee_members
SELECT 
  cm.id,
  cm.full_name,
  cm.user_id,
  cm.slot_type,
  cm.status,
  cm.committee_id
FROM committee_members cm
WHERE cm.slot_type = 'shared';

-- 3. Current RLS policies on shared_groups
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'shared_groups';
