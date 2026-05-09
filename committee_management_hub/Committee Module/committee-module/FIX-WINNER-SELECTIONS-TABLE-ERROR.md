# 🔧 Fix: Winner Selections Table Missing

## ❌ Error You're Seeing:

```
Failed to fetch winners: Could not find the table 
'public.winner_selections' in the schema cache
```

## ✅ Solution: Create the Table

The `winner_selections` table doesn't exist in your database yet. You need to run the SQL migration.

---

## 🚀 Quick Fix Steps

### Step 1: Open Supabase Dashboard

1. Go to: **https://supabase.com**
2. Login to your account
3. Select your project

### Step 2: Open SQL Editor

1. Click **"SQL Editor"** in the left sidebar
2. Click **"New Query"**

### Step 3: Copy and Run the SQL

**Copy this entire SQL script:**

```sql
-- Create winner_selections table
CREATE TABLE IF NOT EXISTS public.winner_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID NOT NULL REFERENCES public.committees(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.committee_members(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  member_email TEXT NOT NULL,
  cycle_number INTEGER NOT NULL DEFAULT 1,
  selected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  selection_method TEXT NOT NULL CHECK (selection_method IN ('random', 'manual')),
  selected_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(committee_id, cycle_number)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_winner_selections_committee 
ON public.winner_selections(committee_id);

CREATE INDEX IF NOT EXISTS idx_winner_selections_member 
ON public.winner_selections(member_id);

CREATE INDEX IF NOT EXISTS idx_winner_selections_cycle 
ON public.winner_selections(committee_id, cycle_number);

-- Enable RLS
ALTER TABLE public.winner_selections ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view winner selections for their committees"
ON public.winner_selections FOR SELECT
USING (
  committee_id IN (
    SELECT committee_id FROM public.committee_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Committee admins can insert winner selections"
ON public.winner_selections FOR INSERT
WITH CHECK (
  committee_id IN (
    SELECT id FROM public.committees WHERE created_by = auth.uid()
  )
);

CREATE POLICY "Committee admins can update winner selections"
ON public.winner_selections FOR UPDATE
USING (
  committee_id IN (
    SELECT id FROM public.committees WHERE created_by = auth.uid()
  )
);

CREATE POLICY "Committee admins can delete winner selections"
ON public.winner_selections FOR DELETE
USING (
  committee_id IN (
    SELECT id FROM public.committees WHERE created_by = auth.uid()
  )
);
```

### Step 4: Run the Query

1. Paste the SQL into the editor
2. Click **"Run"** button (or press Ctrl+Enter)
3. Wait for success message: ✅ **"Success. No rows returned"**

### Step 5: Verify Table Created

1. Click **"Table Editor"** in left sidebar
2. Look for **"winner_selections"** table in the list
3. Should see the table with columns: id, committee_id, member_id, etc.

### Step 6: Refresh Your App

1. Go back to your app: **http://localhost:4200/**
2. Hard refresh: **Ctrl + Shift + R**
3. Navigate to Committee Details
4. Try selecting a winner again

---

## 🎯 What This Table Does

### Stores Winner Selection Records:
- **id** - Unique identifier
- **committee_id** - Which committee
- **member_id** - Which member won
- **member_name** - Winner's name
- **member_email** - Winner's email
- **cycle_number** - Which cycle (1, 2, 3, etc.)
- **selection_method** - 'random' or 'manual'
- **selected_by** - Admin user ID or 'system'
- **selected_at** - When they were selected
- **created_at** - Record creation time

### Ensures:
- ✅ One winner per cycle per committee
- ✅ Only committee members can view winners
- ✅ Only admins can select winners
- ✅ Fast queries with indexes

---

## ✅ After Running Migration

### You Should Be Able To:

1. ✅ Click "Select Yourself" or "Select Random"
2. ✅ See the winner selection popup modal
3. ✅ Winner gets highlighted in members list
4. ✅ Winner's payment details show in Payments page
5. ✅ Announcement sent to all members

---

## 🐛 Troubleshooting

### Issue: "relation already exists"

**This is OK!** It means the table was already created.
- Just continue to next step
- Refresh your app

### Issue: "permission denied"

**Solution:**
- Make sure you're logged into Supabase
- Make sure you're in the correct project
- Check you have admin access

### Issue: "foreign key constraint"

**Solution:**
- Make sure `committees` table exists
- Make sure `committee_members` table exists
- Run those migrations first if needed

### Issue: Still getting errors after migration

**Check:**
1. Table was actually created (check Table Editor)
2. You refreshed the app (Ctrl + Shift + R)
3. You're logged in to the app
4. Browser console for new errors

---

## 📊 Verify Migration Success

### In Supabase Dashboard:

1. Go to **Table Editor**
2. Find **winner_selections** table
3. Should see these columns:
   - id (uuid)
   - committee_id (uuid)
   - member_id (uuid)
   - member_name (text)
   - member_email (text)
   - cycle_number (int4)
   - selected_at (timestamptz)
   - selection_method (text)
   - selected_by (text)
   - created_at (timestamptz)

### In Your App:

1. Open browser console (F12)
2. Navigate to Committee Details
3. Click "Select Yourself"
4. Should see: **"Winner modal should show: [Your Name]"**
5. Should see: **Popup modal appears!** 🎉

---

## 🎉 Success Indicators

After running the migration, you should see:

1. ✅ No more "table not found" errors
2. ✅ Winner selection works
3. ✅ Popup modal appears
4. ✅ Winner highlighted in orange
5. ✅ Payment details show in Payments page
6. ✅ Announcements sent

---

## 📝 Alternative: Run from File

If you prefer, the SQL is also saved in:
```
database-migrations/create-winner-selections-table.sql
```

You can:
1. Open this file
2. Copy all contents
3. Paste into Supabase SQL Editor
4. Run it

---

## 🚀 Next Steps

After creating the table:

1. **Refresh your app** (Ctrl + Shift + R)
2. **Navigate to Committee Details**
3. **Click "Select Yourself" or "Select Random"**
4. **Watch the popup appear!** 🎊
5. **See winner highlighted in orange**
6. **Check Payments page for payment details**

---

**Run the SQL migration now and the winner selection will work perfectly!** 🏆
