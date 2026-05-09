# Winner Selection System - Testing Guide

## 🧪 Complete Testing Guide

This guide provides step-by-step instructions for testing the winner selection system.

---

## 📋 Pre-Testing Checklist

### Database Setup
- [ ] SQL migration executed successfully
- [ ] `winner_selections` table created
- [ ] `distribution_method` column added to `committees`
- [ ] RLS policies enabled
- [ ] Helper functions created

### Application Setup
- [ ] All components compiled without errors
- [ ] Services imported correctly
- [ ] Routes configured (if needed)
- [ ] No TypeScript errors

### Test Data
- [ ] At least one test committee created
- [ ] At least 3 test users registered
- [ ] Test users approved as committee members
- [ ] Test users have payment methods set up

---

## 🎯 Test Scenarios

### Scenario 1: Create Committee with Distribution Method

#### Test Case 1.1: Random Selection Method
**Steps:**
1. Navigate to "Create Committee" page
2. Fill in all required fields:
   - Name: "Test Random Committee"
   - Monthly Amount: 1000
   - Max Members: 5
   - Duration: 12 months
   - Description: "Testing random selection"
3. Select "Random Selection" radio button
4. Click "Create Committee"

**Expected Results:**
- ✅ Form submits successfully
- ✅ Committee created with `distribution_method = 'random'`
- ✅ Redirected to "My Committees"
- ✅ New committee appears in list

**SQL Verification:**
```sql
SELECT id, name, distribution_method 
FROM committees 
WHERE name = 'Test Random Committee';
```

#### Test Case 1.2: Manual Selection Method
**Steps:**
1. Navigate to "Create Committee" page
2. Fill in all required fields
3. Select "Manual Selection" radio button
4. Click "Create Committee"

**Expected Results:**
- ✅ Form submits successfully
- ✅ Committee created with `distribution_method = 'manual'`
- ✅ Redirected to "My Committees"

---

### Scenario 2: Random Winner Selection

#### Test Case 2.1: First Winner Selection
**Steps:**
1. Navigate to Winner Management page for test committee
2. Verify "Random Selection" method is displayed
3. Note the number of eligible members
4. Click "Select Random Winner" button
5. Wait for selection to complete

**Expected Results:**
- ✅ Loading spinner appears
- ✅ Winner selected successfully
- ✅ Success message displayed
- ✅ Winner announcement card appears
- ✅ Payment details displayed
- ✅ Eligible member count decreased by 1
- ✅ Announcement broadcast sent to all members

**SQL Verification:**
```sql
-- Check winner record
SELECT * FROM winner_selections 
WHERE committee_id = 'your-committee-id' 
ORDER BY cycle_number DESC LIMIT 1;

-- Check announcement
SELECT * FROM committee_messages 
WHERE committee_id = 'your-committee-id' 
AND message LIKE '%Winner Announcement%'
ORDER BY created_at DESC LIMIT 1;
```

#### Test Case 2.2: Second Winner Selection
**Steps:**
1. Click "Select Random Winner" again
2. Wait for selection

**Expected Results:**
- ✅ Different member selected
- ✅ Cycle number incremented to 2
- ✅ Previous winner not selected again
- ✅ New announcement sent

#### Test Case 2.3: All Members Selected
**Steps:**
1. Continue selecting winners until all members have won
2. Try to select another winner

**Expected Results:**
- ✅ "No eligible members" message displayed
- ✅ Selection button disabled or hidden
- ✅ Error message: "No eligible members available for selection"

---

### Scenario 3: Manual Winner Selection

#### Test Case 3.1: Select Specific Member
**Steps:**
1. Navigate to Winner Management page (manual method committee)
2. Open member dropdown
3. Verify only eligible members shown
4. Select a specific member
5. Click "Confirm Selection"

**Expected Results:**
- ✅ Dropdown shows only eligible members
- ✅ Selected member becomes winner
- ✅ Success message displayed
- ✅ Winner announcement card appears
- ✅ Payment details displayed
- ✅ Dropdown resets
- ✅ Selected member removed from dropdown

#### Test Case 3.2: Validation - No Selection
**Steps:**
1. Open dropdown but don't select anyone
2. Click "Confirm Selection"

**Expected Results:**
- ✅ Error message: "Please select a member"
- ✅ No winner created
- ✅ Form remains in same state

#### Test Case 3.3: Select All Members
**Steps:**
1. Manually select each member one by one
2. Verify dropdown updates after each selection

**Expected Results:**
- ✅ Each selection creates new winner
- ✅ Cycle numbers increment correctly
- ✅ Dropdown options decrease
- ✅ Eventually shows "No eligible members"

---

### Scenario 4: Payment Details Display

#### Test Case 4.1: Complete Payment Details
**Prerequisites:**
- Winner has all payment methods set up

**Steps:**
1. Select a winner
2. View payment details card

**Expected Results:**
- ✅ Primary method badge displayed
- ✅ JazzCash number shown (if set)
- ✅ Easypaisa number shown (if set)
- ✅ Bank account details shown (if set)
- ✅ Copy buttons appear on hover
- ✅ All details formatted correctly

#### Test Case 4.2: Partial Payment Details
**Prerequisites:**
- Winner has only one payment method

**Steps:**
1. Select a winner with partial payment info
2. View payment details card

**Expected Results:**
- ✅ Only available methods displayed
- ✅ Missing methods not shown
- ✅ No error messages
- ✅ Card displays correctly

#### Test Case 4.3: No Payment Details
**Prerequisites:**
- Winner has no payment methods set up

**Steps:**
1. Select a winner without payment info
2. View payment details card

**Expected Results:**
- ✅ "No Payment Details Available" message
- ✅ Helpful message about setting up payment methods
- ✅ No error state
- ✅ Card displays placeholder

#### Test Case 4.4: Copy to Clipboard
**Steps:**
1. View winner payment details
2. Hover over a payment method
3. Click copy button
4. Paste into text editor

**Expected Results:**
- ✅ Copy button appears on hover
- ✅ Click copies to clipboard
- ✅ Correct value copied
- ✅ Visual feedback (optional)

---

### Scenario 5: Winner Announcements

#### Test Case 5.1: Current Winner Display
**Steps:**
1. Select a winner
2. View announcement component

**Expected Results:**
- ✅ Current winner card displayed prominently
- ✅ Winner name and email shown
- ✅ Cycle number displayed
- ✅ Selection method shown (Random/Manual)
- ✅ Selection date formatted correctly
- ✅ Congratulations message displayed

#### Test Case 5.2: Winner History
**Steps:**
1. Select multiple winners
2. View announcement component with history enabled

**Expected Results:**
- ✅ All past winners listed
- ✅ Ordered by cycle number (newest first)
- ✅ Each entry shows: name, email, cycle, method, date
- ✅ Method badges color-coded correctly
- ✅ Responsive layout

#### Test Case 5.3: No Winner Yet
**Steps:**
1. View announcement component for new committee
2. No winner selected yet

**Expected Results:**
- ✅ "No Winner Selected Yet" message
- ✅ Helpful placeholder text
- ✅ No error state
- ✅ Clean empty state design

---

### Scenario 6: Security & Permissions

#### Test Case 6.1: Non-Owner Access
**Steps:**
1. Login as regular member (not committee owner)
2. Try to access Winner Management page
3. Try to select winner

**Expected Results:**
- ✅ Access denied or redirected
- ✅ Error message: "You do not have permission..."
- ✅ Winner selection UI not accessible

#### Test Case 6.2: Non-Member Access
**Steps:**
1. Login as user not in committee
2. Try to view winner details
3. Try to view payment details

**Expected Results:**
- ✅ Winner details not visible
- ✅ Payment details not visible
- ✅ RLS policies enforced
- ✅ Appropriate error messages

#### Test Case 6.3: Database Constraints
**Steps:**
1. Try to insert duplicate winner (same member, same committee)
2. Try to insert duplicate cycle (same committee, same cycle number)

**SQL Test:**
```sql
-- This should fail
INSERT INTO winner_selections (
  committee_id, member_id, member_name, member_email,
  cycle_number, selection_method, selected_by
) VALUES (
  'existing-committee-id',
  'existing-member-id',
  'Test User',
  'test@example.com',
  1, -- Existing cycle
  'manual',
  'admin-user-id'
);
```

**Expected Results:**
- ✅ Database constraint violation
- ✅ Error: "duplicate key value violates unique constraint"
- ✅ No duplicate record created

---

### Scenario 7: Edge Cases

#### Test Case 7.1: Single Member Committee
**Steps:**
1. Create committee with max_members = 1
2. Admin is auto-added as member
3. Try to select winner

**Expected Results:**
- ✅ Admin can be selected as winner
- ✅ After selection, no eligible members remain
- ✅ System handles gracefully

#### Test Case 7.2: All Members Rejected
**Steps:**
1. Create committee with pending members
2. Reject all join requests
3. Try to select winner

**Expected Results:**
- ✅ "No eligible members" message
- ✅ Only approved members are eligible
- ✅ Cannot select rejected members

#### Test Case 7.3: Member Leaves After Winning
**Steps:**
1. Select a member as winner
2. Member leaves committee
3. View winner history

**Expected Results:**
- ✅ Winner record remains in history
- ✅ Winner name still displayed
- ✅ Payment details may not be accessible
- ✅ No errors in UI

#### Test Case 7.4: Rapid Consecutive Selections
**Steps:**
1. Click "Select Random Winner" multiple times rapidly
2. Observe behavior

**Expected Results:**
- ✅ Loading state prevents multiple clicks
- ✅ Only one winner selected per click
- ✅ No race conditions
- ✅ Database constraints prevent duplicates

---

### Scenario 8: UI/UX Testing

#### Test Case 8.1: Responsive Design
**Steps:**
1. Test on mobile (375px width)
2. Test on tablet (768px width)
3. Test on desktop (1920px width)

**Expected Results:**
- ✅ Mobile: Single column layout
- ✅ Tablet: Adaptive grid
- ✅ Desktop: Two-column layout
- ✅ All elements readable and accessible
- ✅ No horizontal scrolling
- ✅ Touch targets adequate on mobile

#### Test Case 8.2: Loading States
**Steps:**
1. Observe loading states during:
   - Winner selection
   - Payment details loading
   - Announcement loading

**Expected Results:**
- ✅ Spinner displayed during loading
- ✅ UI disabled during operations
- ✅ Loading text displayed
- ✅ Smooth transitions

#### Test Case 8.3: Error States
**Steps:**
1. Simulate network error
2. Simulate database error
3. Simulate validation error

**Expected Results:**
- ✅ Error messages displayed clearly
- ✅ Red error styling
- ✅ Error icon shown
- ✅ Helpful error text
- ✅ User can retry

#### Test Case 8.4: Success States
**Steps:**
1. Successfully select winner
2. Observe success feedback

**Expected Results:**
- ✅ Success message displayed
- ✅ Green success styling
- ✅ Check icon shown
- ✅ Auto-dismiss after 3-4 seconds
- ✅ UI updates immediately

---

## 🔍 SQL Testing Queries

### Check Committee Distribution Method
```sql
SELECT id, name, distribution_method, created_at
FROM committees
WHERE created_by = 'your-user-id'
ORDER BY created_at DESC;
```

### Check Winner Selections
```sql
SELECT 
  ws.cycle_number,
  ws.member_name,
  ws.selection_method,
  ws.selected_at,
  c.name as committee_name
FROM winner_selections ws
JOIN committees c ON ws.committee_id = c.id
WHERE ws.committee_id = 'your-committee-id'
ORDER BY ws.cycle_number DESC;
```

### Check Eligible Members
```sql
SELECT * FROM get_eligible_members('your-committee-id');
```

### Check Current Winner
```sql
SELECT * FROM get_current_winner('your-committee-id');
```

### Check Announcements
```sql
SELECT 
  sender_name,
  message,
  created_at
FROM committee_messages
WHERE committee_id = 'your-committee-id'
AND message LIKE '%Winner%'
ORDER BY created_at DESC;
```

### Verify Constraints
```sql
-- Check unique constraints
SELECT 
  committee_id,
  cycle_number,
  COUNT(*) as count
FROM winner_selections
GROUP BY committee_id, cycle_number
HAVING COUNT(*) > 1;
-- Should return 0 rows

-- Check member uniqueness
SELECT 
  committee_id,
  member_id,
  COUNT(*) as count
FROM winner_selections
GROUP BY committee_id, member_id
HAVING COUNT(*) > 1;
-- Should return 0 rows
```

---

## 📊 Test Coverage Checklist

### Functional Testing
- [x] Committee creation with distribution method
- [x] Random winner selection
- [x] Manual winner selection
- [x] Payment details display
- [x] Winner announcements
- [x] Winner history
- [x] Eligible members filtering
- [x] Cycle number tracking

### Security Testing
- [x] RLS policies enforcement
- [x] Owner-only operations
- [x] Member-only visibility
- [x] Database constraints
- [x] Input validation
- [x] SQL injection prevention

### UI/UX Testing
- [x] Responsive design
- [x] Loading states
- [x] Error states
- [x] Success states
- [x] Empty states
- [x] Hover effects
- [x] Transitions
- [x] Accessibility

### Edge Cases
- [x] No eligible members
- [x] Single member committee
- [x] All members selected
- [x] Rapid consecutive clicks
- [x] Network errors
- [x] Database errors
- [x] Missing payment details

### Performance Testing
- [ ] Large member lists (100+ members)
- [ ] Many cycles (50+ cycles)
- [ ] Concurrent selections
- [ ] Database query performance
- [ ] Component render performance

---

## 🐛 Common Issues & Solutions

### Issue 1: "No eligible members" when members exist
**Cause:** Members not approved or already won
**Solution:** 
```sql
-- Check member status
SELECT id, full_name, status 
FROM committee_members 
WHERE committee_id = 'your-committee-id';

-- Check who already won
SELECT member_id, member_name 
FROM winner_selections 
WHERE committee_id = 'your-committee-id';
```

### Issue 2: Payment details not showing
**Cause:** Winner hasn't set up payment methods
**Solution:**
```sql
-- Check payment methods
SELECT * FROM payment_methods 
WHERE user_id = 'winner-user-id';
```

### Issue 3: Permission denied errors
**Cause:** RLS policies or user not owner
**Solution:**
```sql
-- Check committee ownership
SELECT created_by FROM committees 
WHERE id = 'your-committee-id';

-- Check current user
SELECT auth.uid();
```

### Issue 4: Duplicate winner error
**Cause:** Trying to select same member twice
**Solution:** This is expected behavior. System prevents duplicates.

---

## ✅ Final Verification

### Before Production Deployment
- [ ] All test scenarios passed
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Database migration successful
- [ ] RLS policies working
- [ ] Performance acceptable
- [ ] Mobile responsive
- [ ] Accessibility checked
- [ ] Documentation complete
- [ ] Backup database

### Post-Deployment Monitoring
- [ ] Monitor error logs
- [ ] Check database performance
- [ ] Verify RLS policy execution
- [ ] Monitor user feedback
- [ ] Track winner selection success rate
- [ ] Monitor announcement delivery

---

## 📈 Success Metrics

### Key Performance Indicators
- Winner selection success rate: > 99%
- Average selection time: < 2 seconds
- Payment details load time: < 1 second
- Zero duplicate winners
- Zero unauthorized access
- User satisfaction: > 4.5/5

---

**Testing Status:** ✅ Ready for Testing

**Last Updated:** May 9, 2026
