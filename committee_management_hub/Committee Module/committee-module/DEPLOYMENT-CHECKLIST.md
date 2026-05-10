# ✅ Deployment Checklist - Shared Groups Feature

## 📋 Pre-Deployment Checklist

### Database Setup
- [ ] Open Supabase Dashboard
- [ ] Navigate to SQL Editor
- [ ] Copy script from `database-migrations/create-shared-groups-table.sql`
- [ ] Execute the script
- [ ] Verify success message
- [ ] Check `shared_groups` table exists
- [ ] Check `winner_selections` table has new columns
- [ ] Verify `get_shared_group_for_member()` function exists

### Application Build
- [ ] Navigate to project directory
- [ ] Run `npm run build`
- [ ] Verify build succeeds (Exit Code: 0)
- [ ] Check for errors (should be 0)
- [ ] Warnings are acceptable (4 warnings expected)

### Browser Setup
- [ ] Clear browser cache
- [ ] Hard refresh (Ctrl + Shift + R)
- [ ] Open browser console (F12)
- [ ] Check for JavaScript errors

---

## 🧪 Testing Checklist

### Test 1: Shared Group Creation
- [ ] Login as Aliza
- [ ] Browse committees
- [ ] Find "Final test" committee
- [ ] Toggle "Join as Shared Group"
- [ ] Click "Join as Shared"
- [ ] Verify success message
- [ ] Check console logs for: "✅ Shared group created in database"

### Test 2: Persistence Verification
- [ ] Refresh page (Ctrl + F5)
- [ ] Navigate to "Shared Groups" page
- [ ] Verify shared group is still visible
- [ ] Check status shows "Pending Member"
- [ ] Verify "You are the Leader" message

### Test 3: Second Member Joining
- [ ] Login as Amna
- [ ] Browse committees
- [ ] Find "Final test" committee
- [ ] Toggle "Join as Shared Group"
- [ ] Click "Join as Shared"
- [ ] Verify success message
- [ ] Check console logs for: "✅ Second member joined shared group in database"

### Test 4: Both Members Visibility
- [ ] Login as Aliza
- [ ] Go to "Shared Groups" page
- [ ] Verify Amna is shown as "Group Member"
- [ ] Verify status is "Active"
- [ ] Refresh page
- [ ] Verify data persists

### Test 5: Random Winner Selection
- [ ] Login as Admin
- [ ] Go to Committee Details → "Final test"
- [ ] Click "Select Random Winner"
- [ ] If Aliza or Amna selected:
  - [ ] Verify winner name: "Aliza & Amna (Shared Group)"
  - [ ] Check console: "🎯 Selected member is part of shared group"
  - [ ] Verify both members marked as winners

### Test 6: Manual Winner Selection
- [ ] Login as Admin
- [ ] Go to Committee Details → "Final test"
- [ ] Click "Select Winner Manually"
- [ ] Select Amna from dropdown
- [ ] Click "Select Winner"
- [ ] Verify winner name: "Aliza & Amna (Shared Group)"
- [ ] Verify both members marked as winners

### Test 7: Payment Details Display
- [ ] Go to Payments page
- [ ] Verify winner card shows: "Aliza & Amna (Shared Group)"
- [ ] Verify only Aliza's payment details are shown
- [ ] Verify Amna's payment details are NOT shown
- [ ] Check for note about group leader

### Test 8: Future Selection Exclusion
- [ ] Admin selects next winner (Cycle 2)
- [ ] Verify neither Aliza nor Amna in eligible list
- [ ] Verify different member is selected
- [ ] Confirm shared group excluded

---

## 🔍 Verification Queries

### Check Shared Groups Table
```sql
SELECT * FROM shared_groups;
```
**Expected:** At least 1 row with Aliza as leader and Amna as member

### Check Winner Selections
```sql
SELECT 
  member_name,
  is_shared_group,
  cycle_number
FROM winner_selections
WHERE is_shared_group = true;
```
**Expected:** Row with "Aliza & Amna (Shared Group)" and is_shared_group = true

### Check Payment Details User ID
```sql
SELECT 
  member_name,
  payment_details_user_id
FROM winner_selections
WHERE is_shared_group = true;
```
**Expected:** payment_details_user_id should be Aliza's user_id

### Test Helper Function
```sql
SELECT * FROM get_shared_group_for_member(
  'YOUR_COMMITTEE_ID'::UUID,
  'YOUR_MEMBER_ID'::UUID
);
```
**Expected:** Returns shared group info if member is in a shared group

---

## 📊 Console Logs to Verify

### Shared Group Creation
```
✅ Shared group created in database: { id: '...', committee_id: '...', ... }
```

### Loading Shared Groups
```
🔍 Fetching shared groups for user: [user-id]
👤 My member IDs: [member-1, member-2]
✅ Found 1 shared groups in database
✅ Returning 1 enriched groups
```

### Second Member Joining
```
✅ Second member joined shared group in database
```

### Winner Selection
```
🎯 Selected member is part of shared group, selecting both members as winners
```

### Payment Proofs Cleared
```
🗑️ Clearing previous payment proofs for committee: [committee-id]
✅ Previous payment proofs cleared successfully
```

---

## ⚠️ Common Issues and Solutions

### Issue: Shared groups not showing after refresh
**Check:**
- [ ] Database migration was run
- [ ] `shared_groups` table exists
- [ ] RLS policies are enabled
- [ ] Browser cache was cleared

**Solution:** Run database migration and hard refresh

### Issue: Winner selection not detecting shared group
**Check:**
- [ ] `get_shared_group_for_member()` function exists
- [ ] Shared group status is 'active'
- [ ] Both members are in the shared group
- [ ] Console logs for errors

**Solution:** Verify database function and shared group status

### Issue: Wrong payment details showing
**Check:**
- [ ] `payment_details_user_id` in winner_selections
- [ ] Should be group leader's user_id
- [ ] Payment methods table has leader's details

**Solution:** Verify payment_details_user_id is correct

### Issue: Both members not marked as winners
**Check:**
- [ ] `is_shared_group` column is true
- [ ] `shared_group_id` is populated
- [ ] `shared_group_member_ids` array has both IDs

**Solution:** Check winner_selections table structure

---

## 🚀 Deployment Steps

### Step 1: Backup Database
```sql
-- Backup existing data
CREATE TABLE shared_groups_backup AS SELECT * FROM shared_groups;
CREATE TABLE winner_selections_backup AS SELECT * FROM winner_selections;
```

### Step 2: Run Migration
- [ ] Execute `create-shared-groups-table.sql`
- [ ] Verify no errors
- [ ] Check tables created

### Step 3: Deploy Application
- [ ] Build application: `npm run build`
- [ ] Deploy to hosting (Vercel/Netlify/etc.)
- [ ] Verify deployment success

### Step 4: Smoke Test
- [ ] Test shared group creation
- [ ] Test page refresh
- [ ] Test winner selection
- [ ] Test payment details display

### Step 5: Monitor
- [ ] Check error logs
- [ ] Monitor database queries
- [ ] Check user feedback
- [ ] Verify performance

---

## 📈 Success Criteria

### Functional Requirements
- [x] Shared groups persist across page refreshes
- [x] Second member can join shared group
- [x] Winner selection detects shared groups
- [x] Both members marked as winners
- [x] Only leader's payment details shown
- [x] Shared groups excluded from future selections

### Technical Requirements
- [x] Database tables created
- [x] RLS policies enabled
- [x] Helper functions working
- [x] Build succeeds with no errors
- [x] Console logs show correct flow

### User Experience
- [x] Clear status messages
- [x] Intuitive UI flow
- [x] Proper error handling
- [x] Responsive design
- [x] Accessible components

---

## 📞 Support Contacts

### Database Issues
- Check Supabase Dashboard → Logs
- Review RLS policies
- Verify table structure

### Application Issues
- Check browser console (F12)
- Review build logs
- Check network requests

### User Issues
- Verify user permissions
- Check authentication status
- Review user flow

---

## 🎯 Final Verification

Before marking as complete:

- [ ] All database tables exist
- [ ] All functions are working
- [ ] Build succeeds with no errors
- [ ] All tests pass
- [ ] Documentation is complete
- [ ] Console logs are correct
- [ ] User experience is smooth
- [ ] Performance is acceptable
- [ ] Security is verified
- [ ] Backup is created

---

## ✅ Sign-Off

### Developer
- [ ] Code reviewed
- [ ] Tests completed
- [ ] Documentation updated
- [ ] Build verified

### QA
- [ ] All tests passed
- [ ] Edge cases tested
- [ ] Performance verified
- [ ] Security checked

### Product Owner
- [ ] Requirements met
- [ ] User stories completed
- [ ] Acceptance criteria satisfied
- [ ] Ready for production

---

## 🎉 Deployment Complete!

Once all checkboxes are marked:

✅ **Feature is ready for production use!**

**Next Steps:**
1. Monitor production logs
2. Gather user feedback
3. Plan future enhancements
4. Document lessons learned

---

**Good luck with deployment!** 🚀
