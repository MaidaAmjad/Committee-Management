# 🎯 Shared Group Winner Selection

## 📋 Requirements

When a shared group member is selected as winner:
1. ✅ **Both members** of the shared group should be marked as winners
2. ✅ **Only Group Leader's payment details** should be displayed to all members
3. ✅ Both members share the payout equally (50/50)

---

## 🔍 Current Challenge

**Issue:** Shared groups are currently stored in-memory (`mockGroups`) in `SharedGroupService`, not in the database.

**Impact:** Winner selection service cannot easily query which members belong to the same shared group.

---

## ✅ Solution Options

### Option 1: Create Shared Groups Database Table (Recommended)

**Pros:**
- Persistent data
- Easy to query
- Reliable winner selection
- Can track shared group history

**Cons:**
- Requires database migration
- More setup work

### Option 2: Pass Shared Group Info During Selection

**Pros:**
- Works with current in-memory system
- No database changes needed

**Cons:**
- Less reliable
- Harder to maintain
- Data loss on refresh

---

## 🚀 Recommended Implementation (Option 1)

### Step 1: Create Shared Groups Table

```sql
CREATE TABLE IF NOT EXISTS public.shared_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID NOT NULL REFERENCES public.committees(id) ON DELETE CASCADE,
  group_leader_member_id UUID NOT NULL REFERENCES public.committee_members(id),
  group_member_member_id UUID REFERENCES public.committee_members(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure only one shared group per pair
  UNIQUE(committee_id, group_leader_member_id, group_member_member_id)
);

CREATE INDEX idx_shared_groups_committee ON public.shared_groups(committee_id);
CREATE INDEX idx_shared_groups_leader ON public.shared_groups(group_leader_member_id);
CREATE INDEX idx_shared_groups_member ON public.shared_groups(group_member_member_id);
```

### Step 2: Update Winner Selection Logic

```typescript
async selectRandomWinner(committeeId: string) {
  // Get eligible members
  const eligible = await this.getEligibleMembers(committeeId);
  
  // Select random member
  const selectedMember = eligible[randomIndex];
  
  // Check if member is part of shared group
  const sharedGroup = await this.getSharedGroupForMember(
    committeeId, 
    selectedMember.id
  );
  
  if (sharedGroup && sharedGroup.group_member_member_id) {
    // Both members are winners
    await this.selectSharedGroupAsWinners(
      committeeId,
      sharedGroup,
      cycleNumber
    );
  } else {
    // Single member winner
    await this.selectSingleWinner(
      committeeId,
      selectedMember,
      cycleNumber
    );
  }
}
```

### Step 3: Select Shared Group as Winners

```typescript
async selectSharedGroupAsWinners(
  committeeId: string,
  sharedGroup: SharedGroup,
  cycleNumber: number
) {
  // Get both members
  const leader = await this.getMember(sharedGroup.group_leader_member_id);
  const member = await this.getMember(sharedGroup.group_member_member_id);
  
  // Insert winner record with BOTH members
  await this.supabase.from('winner_selections').insert({
    committee_id: committeeId,
    member_id: sharedGroup.group_leader_member_id, // Primary winner (for payment details)
    member_name: `${leader.full_name} & ${member.full_name} (Shared Group)`,
    member_email: leader.email,
    cycle_number: cycleNumber,
    selection_method: 'random',
    selected_by: 'system',
    is_shared_group: true,
    shared_group_id: sharedGroup.id,
    shared_group_member_ids: [leader.id, member.id], // Array of both member IDs
    payment_details_user_id: leader.user_id // Only leader's payment details shown
  });
}
```

### Step 4: Update Winner Selections Table

```sql
ALTER TABLE public.winner_selections 
ADD COLUMN IF NOT EXISTS is_shared_group BOOLEAN DEFAULT FALSE;

ALTER TABLE public.winner_selections 
ADD COLUMN IF NOT EXISTS shared_group_id UUID REFERENCES public.shared_groups(id);

ALTER TABLE public.winner_selections 
ADD COLUMN IF NOT EXISTS shared_group_member_ids UUID[];

ALTER TABLE public.winner_selections 
ADD COLUMN IF NOT EXISTS payment_details_user_id UUID REFERENCES auth.users(id);
```

### Step 5: Display Payment Details

```typescript
// In payments page
async loadWinnerPaymentDetails(winner: WinnerSelection) {
  if (winner.is_shared_group) {
    // Show only group leader's payment details
    const paymentDetails = await this.getPaymentDetails(
      winner.payment_details_user_id
    );
    
    // Display with note
    return {
      ...paymentDetails,
      note: 'Payment details of Group Leader (shared 50/50 with partner)'
    };
  } else {
    // Show single member's payment details
    return await this.getPaymentDetails(winner.member_id);
  }
}
```

---

## 📊 Example Flow

### Scenario: Aliza & Amna (Shared Group)

**Setup:**
- Aliza = Group Leader
- Amna = Group Member
- Both share 1 slot (0.5 each)

### Admin Selects Random Winner

```
System picks random member
    ↓
Selected: Amna (member of shared group)
    ↓
System detects: Amna is in shared group with Aliza
    ↓
System selects BOTH as winners:
  - Aliza (Group Leader) ← Payment details shown
  - Amna (Group Member)
    ↓
Winner display: "Aliza & Amna (Shared Group)"
    ↓
Payment details: Only Aliza's details shown
    ↓
Payout: Split 50/50 between Aliza & Amna
```

### Payment Details Display

```
💳 Winner Information

🏆 Winners: Aliza & Amna (Shared Group)
💰 Payout: $2,000 (split 50/50)
  - Aliza: $1,000
  - Amna: $1,000

📱 Payment Details (Group Leader: Aliza)

JazzCash: 03001234567
Easypaisa: 03009876543
Bank: HBL - 1234567890

ℹ️ Note: Payment will be made to Group Leader.
Group Leader is responsible for distributing
the share to their partner.
```

---

## 🎯 Key Features

### 1. Both Members Selected
- Winner record includes both member IDs
- Both marked as winners in database
- Both excluded from future selections

### 2. Leader's Payment Details Only
- Only group leader's payment details displayed
- Clear indication it's a shared group
- Note about 50/50 split

### 3. Fair Payout
- Total payout split equally
- Each member gets 50%
- Leader responsible for distribution

### 4. Clear Communication
- Winner name shows both members
- "(Shared Group)" badge displayed
- Payment instructions clear

---

## 🐛 Edge Cases

### Case 1: Group Leader Selected
```
Selected: Aliza (leader)
Result: Both Aliza & Amna selected
Payment: Aliza's details shown
```

### Case 2: Group Member Selected
```
Selected: Amna (member)
Result: Both Aliza & Amna selected
Payment: Aliza's details shown (not Amna's)
```

### Case 3: Incomplete Shared Group
```
Selected: Aliza (leader, no partner yet)
Result: Only Aliza selected
Payment: Aliza's details shown
Note: "Waiting for partner to join"
```

### Case 4: Both Already Won
```
Previous winners: [Aliza & Amna]
Eligible members: [Others only]
Result: Shared group excluded from selection
```

---

## 🚀 Implementation Steps

### Phase 1: Database Setup
1. ✅ Create `shared_groups` table
2. ✅ Update `winner_selections` table
3. ✅ Add indexes and constraints

### Phase 2: Service Updates
1. ✅ Update `SharedGroupService` to use database
2. ✅ Add `getSharedGroupForMember()` method
3. ✅ Update `selectRandomWinner()` logic
4. ✅ Add `selectSharedGroupAsWinners()` method

### Phase 3: UI Updates
1. ✅ Display both member names
2. ✅ Show "(Shared Group)" badge
3. ✅ Display only leader's payment details
4. ✅ Add payout split information

### Phase 4: Testing
1. ✅ Test selecting group leader
2. ✅ Test selecting group member
3. ✅ Test payment details display
4. ✅ Test payout calculation

---

## 📝 Current Status

**Status:** ⚠️ **Requires Implementation**

**Blockers:**
1. Shared groups currently in-memory only
2. Need database table for shared groups
3. Need to update winner selection logic
4. Need to update payment details display

**Next Steps:**
1. Create `shared_groups` database table
2. Migrate `SharedGroupService` to use database
3. Update winner selection logic
4. Update payment details UI

---

## 💡 Quick Workaround (Temporary)

Until full implementation, you can:

1. **Manually track shared groups** in a spreadsheet
2. **Select both members manually** when one is chosen
3. **Note in announcement** that it's a shared group
4. **Share leader's payment details** manually

---

## 🎉 Expected Result After Implementation

```
Admin clicks "Select Random"
    ↓
System picks: Amna
    ↓
System detects: Shared group with Aliza
    ↓
✅ Both selected as winners
✅ Display: "Aliza & Amna (Shared Group)"
✅ Payment: Only Aliza's details shown
✅ Note: "Split 50/50 between partners"
```

---

**This feature requires database implementation for shared groups. Would you like me to proceed with creating the database tables and updating the logic?** 🚀
