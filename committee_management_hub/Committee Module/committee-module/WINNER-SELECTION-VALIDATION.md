# ✅ Winner Selection - No Repeat Winners

## 🎯 Feature Overview

When selecting a winner (manually or randomly), the system **automatically excludes members who have already won** in previous cycles.

---

## ✅ How It Works

### 1. Get Eligible Members

**Method:** `getEligibleMembers(committeeId)`

**Logic:**
```typescript
// Step 1: Get all approved members
SELECT * FROM committee_members 
WHERE committee_id = ? AND status = 'approved'

// Step 2: Get all previous winners
SELECT member_id FROM winner_selections 
WHERE committee_id = ?

// Step 3: Filter out previous winners
eligible = members.filter(m => !previousWinners.includes(m.id))
```

### 2. Random Selection

**Method:** `selectRandomWinner(committeeId)`

**Logic:**
```typescript
// Get eligible members (excludes previous winners)
const eligible = await getEligibleMembers(committeeId);

// If no eligible members
if (eligible.length === 0) {
  return error: 'No eligible members available for selection'
}

// Select random from eligible only
const randomIndex = Math.floor(Math.random() * eligible.length);
const winner = eligible[randomIndex];
```

### 3. Manual Selection

**Method:** `selectManualWinner(committeeId, memberId)`

**Logic:**
```typescript
// Get eligible members (excludes previous winners)
const eligible = await getEligibleMembers(committeeId);

// Check if selected member is eligible
const selectedMember = eligible.find(m => m.id === memberId);

if (!selectedMember) {
  return error: 'Selected member is not eligible or has already won'
}

// Proceed with selection
```

---

## 🔄 Winner Selection Flow

```
Admin clicks "Select Winner"
    ↓
System fetches all approved members
    ↓
System fetches all previous winners
    ↓
System filters out previous winners
    ↓
System shows only eligible members
    ↓
Admin selects from eligible members
    ↓
System validates selection
    ↓
If member already won → ❌ Error
If member eligible → ✅ Select as winner
    ↓
System increments cycle number
    ↓
System saves winner to winner_selections table
    ↓
System sends announcement to all members
    ↓
System refreshes eligible members list
```

---

## 📊 Example Scenario

### Committee: "random amna"
- **Total Members:** 5
  - Amna Shakeel (Admin)
  - Maida Amjad
  - Ali Hassan
  - Sara Ahmed
  - Ahmed Khan

### Cycle 1: Select Winner
```
Eligible Members: [Amna, Maida, Ali, Sara, Ahmed]
Admin selects: Maida Amjad
✅ Winner: Maida Amjad (Cycle 1)
```

### Cycle 2: Select Winner
```
Previous Winners: [Maida]
Eligible Members: [Amna, Ali, Sara, Ahmed]  ← Maida excluded
Admin selects: Ali Hassan
✅ Winner: Ali Hassan (Cycle 2)
```

### Cycle 3: Select Winner
```
Previous Winners: [Maida, Ali]
Eligible Members: [Amna, Sara, Ahmed]  ← Maida & Ali excluded
Admin tries to select: Maida Amjad
❌ Error: "Selected member is not eligible or has already won"
```

### Cycle 4: Select Winner
```
Previous Winners: [Maida, Ali, Sara]
Eligible Members: [Amna, Ahmed]
Admin selects: Amna Shakeel
✅ Winner: Amna Shakeel (Cycle 4)
```

### Cycle 5: Select Winner
```
Previous Winners: [Maida, Ali, Sara, Amna]
Eligible Members: [Ahmed]  ← Only one left
Admin selects: Ahmed Khan
✅ Winner: Ahmed Khan (Cycle 5)
```

### Cycle 6: Select Winner
```
Previous Winners: [Maida, Ali, Sara, Amna, Ahmed]
Eligible Members: []  ← No one left!
❌ Error: "No eligible members available for selection"
```

---

## 🎯 Key Features

### 1. Automatic Filtering
- System automatically excludes previous winners
- No manual checking required
- Prevents accidental duplicate selections

### 2. Validation on Selection
- Manual selection validates member eligibility
- Random selection only picks from eligible members
- Clear error messages if member already won

### 3. Cycle Tracking
- Each winner is assigned a cycle number
- Cycle number increments automatically
- Easy to track winner history

### 4. Fair Distribution
- Each member gets one turn
- No member can win twice
- Ensures fair rotation

---

## 🧪 Testing Scenarios

### Test 1: First Winner Selection
1. **Login as Admin**
2. Go to **Committee Details**
3. Click **"Select Random"** or **"Select Yourself"**
4. ✅ Should select a winner from all members
5. ✅ Winner should be saved with cycle_number = 1

### Test 2: Second Winner Selection
1. Still logged in as **Admin**
2. Try to select winner again
3. ✅ Previous winner should NOT appear in eligible list
4. ✅ Should only show members who haven't won

### Test 3: Try to Select Previous Winner
1. **Login as Admin**
2. Try to manually select a member who already won
3. ❌ Should show error: "Selected member is not eligible or has already won"

### Test 4: Random Selection Excludes Previous Winners
1. **Login as Admin**
2. Click **"Select Random"** multiple times (for different cycles)
3. ✅ Should never select the same member twice
4. ✅ Each cycle should have a different winner

### Test 5: All Members Have Won
1. Select winners for all cycles until everyone has won
2. Try to select another winner
3. ❌ Should show error: "No eligible members available for selection"

---

## 🔍 Verify in Database

### Check Winner History
```sql
SELECT 
  cycle_number,
  member_name,
  selection_method,
  selected_at
FROM winner_selections
WHERE committee_id = 'YOUR_COMMITTEE_ID'
ORDER BY cycle_number ASC;
```

**Expected Result:**
```
cycle_number | member_name   | selection_method | selected_at
-------------|---------------|------------------|------------------
1            | Maida Amjad   | manual          | 2026-05-09 10:00
2            | Ali Hassan    | random          | 2026-05-09 11:00
3            | Sara Ahmed    | manual          | 2026-05-09 12:00
```

### Check Eligible Members
```sql
-- Get all approved members
SELECT id, full_name FROM committee_members
WHERE committee_id = 'YOUR_COMMITTEE_ID' 
  AND status = 'approved';

-- Get previous winners
SELECT member_id, member_name FROM winner_selections
WHERE committee_id = 'YOUR_COMMITTEE_ID';

-- Eligible = All members - Previous winners
```

---

## 🐛 Troubleshooting

### Issue: Same member selected twice

**Check 1: Winner selections table**
```sql
SELECT * FROM winner_selections 
WHERE committee_id = 'YOUR_COMMITTEE_ID'
ORDER BY cycle_number;
```
If same member_id appears twice → Database issue

**Check 2: Eligible members query**
```sql
-- This should exclude previous winners
SELECT cm.id, cm.full_name
FROM committee_members cm
WHERE cm.committee_id = 'YOUR_COMMITTEE_ID'
  AND cm.status = 'approved'
  AND cm.id NOT IN (
    SELECT member_id FROM winner_selections 
    WHERE committee_id = 'YOUR_COMMITTEE_ID'
  );
```

### Issue: Error "No eligible members"

**Reason:** All members have already won

**Solution:** 
- Committee cycle is complete
- Either end the committee or reset winner selections for a new round

---

## 💡 UI Indicators

### Eligible Members Dropdown (Manual Selection)
```
Select Winner:
  ☐ Amna Shakeel
  ☐ Ali Hassan
  ☐ Sara Ahmed
  
(Maida Amjad not shown - already won)
```

### Random Selection
```
Click "Select Random"
    ↓
System picks from: [Amna, Ali, Sara]
    ↓
Never picks: Maida (already won)
```

### Error Messages
```
❌ "Selected member is not eligible or has already won"
❌ "No eligible members available for selection"
```

---

## 📝 Summary

✅ **System automatically excludes previous winners**
✅ **Manual selection validates eligibility**
✅ **Random selection only picks from eligible members**
✅ **Clear error messages for invalid selections**
✅ **Fair rotation ensures everyone gets one turn**

**The system is already working correctly! Each member can only win once per committee cycle.** 🎉

---

## 🚀 How to Verify

1. **Select first winner** → Check winner_selections table
2. **Try to select same winner again** → Should show error or not appear in list
3. **Select random winner multiple times** → Should never repeat
4. **Check database** → Each member_id should appear only once

**The validation is already in place and working!** ✅
