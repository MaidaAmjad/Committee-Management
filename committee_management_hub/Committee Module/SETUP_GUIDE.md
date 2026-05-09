# Shared Slot System - Setup Guide

## Current Issue

The committee shows "2 SLOTS LEFT" instead of "1 SLOT LEFT" because:
1. The database doesn't have the `slot_type` column yet
2. Existing committee members don't have `slot_type` set

## Quick Fix Steps

### Option 1: Run Database Migration (Recommended)

1. **Access your Supabase Dashboard**
   - Go to https://supabase.com
   - Select your project
   - Navigate to SQL Editor

2. **Run the Migration**
   - Copy the contents of `DATABASE_MIGRATION.sql`
   - Paste into SQL Editor
   - Click "Run"

3. **Verify**
   - The verification queries at the end will show:
     - Columns added successfully
     - All existing members have `slot_type = 'full'`
     - Correct slot calculations

### Option 2: Manual Database Update (Quick Test)

If you just want to test with your current committee:

```sql
-- Add the columns
ALTER TABLE committee_members 
ADD COLUMN IF NOT EXISTS slot_type VARCHAR(10) DEFAULT 'full';

-- Update existing records
UPDATE committee_members 
SET slot_type = 'full' 
WHERE slot_type IS NULL;
```

### Option 3: Use Supabase Table Editor

1. Go to Supabase Dashboard → Table Editor
2. Select `committee_members` table
3. Click "Add Column"
4. Add column:
   - Name: `slot_type`
   - Type: `text`
   - Default value: `'full'`
5. Add another column:
   - Name: `shared_group_id`
   - Type: `uuid`
   - Nullable: Yes

## Expected Results After Migration

### Before Migration
```
Committee: "Debt committee"
Max Members: 2
Members: 1 (creator)
Display: "2 SLOTS LEFT" ❌ (incorrect)
Slots Used: 0 (not calculated)
```

### After Migration
```
Committee: "Debt committee"
Max Members: 2
Members: 1 (creator with slot_type='full')
Display: "1 SLOT LEFT" ✅ (correct)
Slots Used: 1.0
```

## Testing the Shared Slot Feature

After migration, test these scenarios:

### Test 1: Normal Full Member Join
1. Create a committee with 3 slots
2. Join as a full member
3. **Expected**: Shows "1 SLOT LEFT" (2 used, 1 remaining)

### Test 2: Shared Member Join
1. Create a committee with 2 slots
2. Join as a shared group member
3. **Expected**: Shows "0.5 SLOT LEFT" with orange badge
4. **Expected**: Next user forced to join as shared

### Test 3: Complete Shared Group
1. From Test 2, have another user join as shared
2. **Expected**: Shows "NO SLOTS" - committee full
3. **Expected**: Join button disabled

## Troubleshooting

### Issue: Still showing wrong slot count

**Solution 1**: Clear browser cache and refresh
```bash
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

**Solution 2**: Check database
```sql
-- Verify slot_type column exists
SELECT * FROM committee_members LIMIT 1;

-- Check if slot_type is set
SELECT id, full_name, slot_type 
FROM committee_members 
WHERE committee_id = 'YOUR_COMMITTEE_ID';
```

**Solution 3**: Restart the dev server
```bash
# Stop current server (Ctrl+C)
# Then restart
npm start
```

### Issue: Error when joining as shared

**Cause**: `shared_group_id` column missing

**Solution**: Run the full migration script

### Issue: Can't see shared toggle

**Cause**: UI not updated

**Solution**: Hard refresh browser (Ctrl+Shift+R)

## Code Changes Summary

The following files were updated to support shared slots:

1. **committee.service.ts**
   - Added `slot_type` and `shared_group_id` to interfaces
   - Updated `getAllCommittees()` to calculate slot usage
   - Added `joinCommitteeAsShared()` method
   - Updated `createCommittee()` to set `slot_type: 'full'` for creator

2. **browse-committees.ts**
   - Added `getSlotsLeft()` - calculates remaining slots
   - Added `getSlotLabel()` - formats display text
   - Added `canOnlyJoinAsShared()` - checks if forced shared
   - Added `isFullJoinDisabled()` - validates full member join
   - Updated `joinCommittee()` - handles shared group logic

3. **browse-committees.html**
   - Updated slot display to show fractional slots
   - Added warning message for partial slots
   - Modified join button to enforce restrictions
   - Added visual indicators for slot types

## Next Steps

1. ✅ Run database migration
2. ✅ Test committee creation (creator should use 1 slot)
3. ✅ Test full member joining
4. ✅ Test shared member joining
5. ✅ Test partial slot (0.5) scenario
6. ✅ Verify committee becomes full correctly

## Support

If you encounter issues:
1. Check browser console for errors (F12)
2. Verify database migration ran successfully
3. Ensure dev server is running
4. Check that Supabase connection is working

## Database Schema Reference

```typescript
interface CommitteeMember {
  id: string;
  committee_id: string;
  user_id: string;
  full_name: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  slot_type: 'full' | 'shared';        // NEW
  shared_group_id: string | null;      // NEW
  joined_at: string;
}

interface Committee {
  // ... existing fields
  member_count?: number;               // Total members
  slots_used?: number;                 // e.g., 1.5
  has_partial_slot?: boolean;          // true if 0.5 available
}
```

## Success Criteria

✅ Creator occupies 1 full slot
✅ Full members occupy 1 slot each
✅ Shared members occupy 0.5 slot each
✅ Slot display shows fractional values (0.5, 1.5, etc.)
✅ Joining restricted when slots insufficient
✅ Shared joining forced when only 0.5 slot remains
✅ Committee becomes full at exact capacity
