# 🔧 Fix Slot Count Issue - Quick Guide

## The Problem
Your committee shows "**2 SLOTS LEFT**" but should show "**1 SLOT LEFT**" because the database needs to be updated.

## The Solution (5 Minutes)

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com
2. Click on your project
3. Click "SQL Editor" in the left sidebar

### Step 2: Run This SQL
Copy and paste this into the SQL Editor:

```sql
-- Add the slot_type column
ALTER TABLE committee_members 
ADD COLUMN IF NOT EXISTS slot_type VARCHAR(10) DEFAULT 'full';

-- Update existing members to be 'full' type
UPDATE committee_members 
SET slot_type = 'full' 
WHERE slot_type IS NULL;

-- Verify it worked
SELECT 
  c.name as committee_name,
  c.max_members,
  COUNT(cm.id) as members,
  SUM(CASE WHEN cm.slot_type = 'shared' THEN 0.5 ELSE 1 END) as slots_used
FROM committees c
LEFT JOIN committee_members cm ON c.id = cm.committee_id AND cm.status = 'approved'
GROUP BY c.id, c.name, c.max_members;
```

### Step 3: Click "Run"
Click the "Run" button in Supabase SQL Editor

### Step 4: Refresh Your Browser
Go back to your app and press `Ctrl + Shift + R` (or `Cmd + Shift + R` on Mac)

## ✅ Expected Result

**Before:**
```
Debt committee
Max Members: 2
Display: "2 SLOTS LEFT" ❌
```

**After:**
```
Debt committee  
Max Members: 2
Display: "1 SLOT LEFT" ✅
```

## Verification

After running the SQL, you should see output like:
```
committee_name | max_members | members | slots_used
Debt committee |     2       |    1    |    1.0
```

This confirms:
- ✅ Column added successfully
- ✅ Existing members marked as 'full'
- ✅ Slot calculation working correctly

## Troubleshooting

### Error: "column already exists"
**Solution:** That's fine! It means the column was already added. Just run the UPDATE statement:
```sql
UPDATE committee_members 
SET slot_type = 'full' 
WHERE slot_type IS NULL;
```

### Still showing wrong count after refresh
**Solution:** 
1. Hard refresh: `Ctrl + Shift + R`
2. Clear browser cache
3. Check the verification query shows correct `slots_used`

### Error: "permission denied"
**Solution:** Make sure you're logged into Supabase with the correct account that owns this project.

## What This Does

1. **Adds `slot_type` column** - Tracks if a member is 'full' (1 slot) or 'shared' (0.5 slot)
2. **Sets existing members to 'full'** - Your current committee members occupy full slots
3. **Enables shared slot feature** - New members can now join as shared (0.5 slot each)

## Next Steps

After the migration:
- ✅ Create new committees - creator will use 1 slot correctly
- ✅ Join as full member - uses 1 slot
- ✅ Join as shared member - uses 0.5 slot
- ✅ See "0.5 SLOT LEFT" when applicable
- ✅ Forced shared joining when only 0.5 slot remains

## Need More Help?

See the full documentation:
- `DATABASE_MIGRATION.sql` - Complete migration with all options
- `SETUP_GUIDE.md` - Detailed setup instructions
- `SHARED_SLOT_IMPLEMENTATION.md` - Technical details

---

**That's it!** Your slot counting should now work correctly. 🎉
