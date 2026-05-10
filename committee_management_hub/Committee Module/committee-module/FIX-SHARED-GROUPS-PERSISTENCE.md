# 🔧 Fix: Shared Groups Not Persisting After Refresh

## ❌ Issue

When you create a shared group and refresh the page, the shared group disappears.

**Root Cause:** Shared groups are stored in-memory (`mockGroups` array) instead of the database.

---

## ✅ Solution

### Step 1: Run Database Migration

First, create the `shared_groups` table in Supabase:

1. Open **Supabase Dashboard** → **SQL Editor**
2. Run the script from: `database-migrations/create-shared-groups-table.sql`
3. This creates the `shared_groups` table

### Step 2: Update SharedGroupService

The service needs to be updated to:
1. **Save** shared groups to database when created
2. **Load** shared groups from database (not from memory)

**Current Status:** ⚠️ Partially implemented, needs completion

---

## 🚀 Quick Workaround (Temporary)

Until the full database implementation is complete, shared groups will be lost on refresh. To work around this:

1. **Don't refresh** the page after creating a shared group
2. **Complete the group setup** (invite member, upload proofs) in one session
3. **Bookmark** the shared group page to return directly

---

## 📋 What Needs to Be Done

### 1. Complete Database Schema ✅
- [x] Create `shared_groups` table
- [x] Add foreign keys to `committee_members`
- [x] Add RLS policies

### 2. Update Service Methods ⚠️
- [ ] Fix `createSharedGroup()` to save to database
- [ ] Fix `getMySharedGroups()` to load from database
- [ ] Update `inviteMember()` to update database
- [ ] Update `acceptInvitation()` to update database

### 3. Test Persistence ⏳
- [ ] Create shared group
- [ ] Refresh page
- [ ] Verify group still shows

---

## 💻 Implementation Plan

### Phase 1: Save to Database (Priority)

**File:** `shared-group.service.ts`

**Method:** `createSharedGroup()`

**Changes Needed:**
```typescript
async createSharedGroup(committeeId, committeeName, monthlyAmount) {
  // 1. Get current user's committee_member ID
  const { data: memberRecord } = await this.supabase
    .from('committee_members')
    .select('id')
    .eq('committee_id', committeeId)
    .eq('user_id', user.id)
    .eq('slot_type', 'shared')
    .single();

  // 2. Insert into shared_groups table
  const { data: dbGroup } = await this.supabase
    .from('shared_groups')
    .insert({
      committee_id: committeeId,
      group_leader_member_id: memberRecord.id,
      status: 'pending'
    })
    .select()
    .single();

  // 3. Return the created group
  return { data: dbGroup, error: null };
}
```

### Phase 2: Load from Database

**Method:** `getMySharedGroups()`

**Changes Needed:**
```typescript
async getMySharedGroups() {
  // 1. Get user's member IDs
  const { data: myMemberRecords } = await this.supabase
    .from('committee_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('slot_type', 'shared');

  const myMemberIds = myMemberRecords.map(m => m.id);

  // 2. Get shared groups from database
  const { data: dbGroups } = await this.supabase
    .from('shared_groups')
    .select('*')
    .or(`group_leader_member_id.in.(${myMemberIds}),group_member_member_id.in.(${myMemberIds})`);

  // 3. Enrich with committee and member details
  // 4. Return enriched groups
}
```

---

## 🧪 Testing Steps

### Test 1: Create and Persist
1. **Create shared group** as Aliza
2. **Refresh page** (Ctrl + F5)
3. ✅ Should still see shared group
4. ✅ Should show "You are the Leader"

### Test 2: Invite Member
1. **Invite Amna** to join
2. **Refresh page**
3. ✅ Should still show pending invitation
4. ✅ Amna should see invitation

### Test 3: Accept Invitation
1. **Login as Amna**
2. **Accept invitation**
3. **Refresh page**
4. ✅ Should show as active member
5. ✅ Both members should see each other

---

## 📊 Database Structure

### shared_groups Table
```sql
id                      UUID PRIMARY KEY
committee_id            UUID (FK to committees)
group_leader_member_id  UUID (FK to committee_members)
group_member_member_id  UUID (FK to committee_members, nullable)
status                  TEXT ('pending', 'active', 'completed')
created_at              TIMESTAMPTZ
updated_at              TIMESTAMPTZ
```

### Example Data
```
id: abc-123
committee_id: xyz-789
group_leader_member_id: member-1 (Aliza)
group_member_member_id: member-2 (Amna)
status: active
```

---

## ⚠️ Current Limitations

Until full implementation:
1. ❌ Shared groups lost on refresh
2. ❌ Cannot recover after page reload
3. ❌ Must complete setup in one session

After implementation:
1. ✅ Shared groups persist across refreshes
2. ✅ Can return anytime
3. ✅ Data never lost

---

## 🎯 Priority

**HIGH PRIORITY** - This is a critical bug that prevents shared groups from working properly.

**Estimated Time:** 2-3 hours to complete full implementation

---

## 📝 Summary

**Problem:** Shared groups stored in memory, lost on refresh

**Solution:** Save to database using `shared_groups` table

**Status:** Database table created ✅, Service needs update ⚠️

**Workaround:** Don't refresh page until feature is complete

---

**Would you like me to complete the full database implementation now?** 🚀
