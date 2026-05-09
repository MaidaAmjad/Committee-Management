# 🔧 Troubleshooting: Create Committee Button Stuck on "Creating..."

## Problem
The "Create Committee" button shows "Creating..." and never completes.

## Root Cause
The database is missing the `distribution_method` column that was added in the winner selection system update.

---

## ✅ Solution (Choose One)

### Option 1: Run Database Migration (Recommended)

This adds the `distribution_method` column and all winner selection features.

**Steps:**
1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy the entire content from: `database-migrations/winner-selection-system.sql`
4. Paste into SQL Editor
5. Click **Run**

**What this does:**
- Adds `distribution_method` column to `committees` table
- Creates `winner_selections` table
- Adds RLS policies
- Creates helper functions

---

### Option 2: Quick Fix (Temporary)

If you want to create committees without the winner selection feature for now:

**SQL to run in Supabase:**
```sql
-- Add distribution_method column with default value
ALTER TABLE committees 
ADD COLUMN IF NOT EXISTS distribution_method TEXT DEFAULT 'random';
```

**Then update the create committee form:**

Remove the distribution method field temporarily by commenting it out in:
`src/app/pages/create-committee/create-committee.html`

Find this section and comment it out:
```html
<!-- Temporarily disabled
<div class="bg-[#fff7ed] rounded-2xl border border-[#fed7aa] p-5">
  ... distribution method section ...
</div>
-->
```

---

### Option 3: Remove Distribution Method Feature

If you don't want the winner selection feature at all:

**1. Update Committee Service**

File: `src/app/core/committee.service.ts`

Remove `distributionMethod` from the interface:
```typescript
export interface CommitteeFormData {
  name: string;
  monthlyAmount: number;
  maxMembers: number;
  description: string;
  durationMonths: number;
  paymentDeadlineDate: string;
  gracePeriodDays: number;
  paymentCycleDays: number;
  // Remove this line:
  // distributionMethod: 'random' | 'manual';
}
```

Remove from the insert:
```typescript
const { data: newCommittee, error } = await this.supabase.from('committees').insert({
  name:                   data.name,
  monthly_amount:         data.monthlyAmount,
  max_members:            data.maxMembers,
  description:            data.description,
  duration_months:        data.durationMonths,
  created_by:             user.id,
  status:                 'Recruiting',
  payment_deadline_date:  data.paymentDeadlineDate || null,
  grace_period_days:      data.gracePeriodDays ?? 3,
  payment_cycle_days:     data.paymentCycleDays ?? 30,
  // Remove this line:
  // distribution_method:    data.distributionMethod || 'random',
}).select('id').single();
```

**2. Update Create Committee Component**

File: `src/app/pages/create-committee/create-committee.ts`

Remove from form:
```typescript
this.form = this.fb.group({
  name:                 ['', [Validators.required, Validators.minLength(3), Validators.maxLength(80)]],
  monthlyAmount:        [null, [Validators.required, Validators.min(1)]],
  maxMembers:           [null, [Validators.required, Validators.min(2), Validators.max(100)]],
  description:          ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
  durationMonths:       [null, [Validators.required, Validators.min(1), Validators.max(120)]],
  paymentDeadlineDate:  ['', Validators.required],
  gracePeriodDays:      [3, [Validators.required, Validators.min(0), Validators.max(30)]],
  paymentCycleDays:     [30, [Validators.required, Validators.min(1), Validators.max(365)]],
  // Remove this line:
  // distributionMethod:   ['random', Validators.required],
});
```

**3. Update Create Committee HTML**

File: `src/app/pages/create-committee/create-committee.html`

Remove the entire "Winner Distribution Method Section" (lines with the distribution method radio buttons).

---

## 🎯 Recommended Solution

**Use Option 1** - Run the full database migration. This gives you:
- ✅ Committee creation working
- ✅ Winner selection features
- ✅ All new functionality
- ✅ Future-proof

---

## 🔍 How to Verify the Fix

### After Running Migration:

**1. Check Database**
```sql
-- Verify column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'committees'
AND column_name = 'distribution_method';
```

Should return:
```
column_name         | data_type | column_default
distribution_method | text      | 'random'
```

**2. Test Committee Creation**
1. Refresh the browser (F5)
2. Fill in the create committee form
3. Select a distribution method
4. Click "Create Committee"
5. Should redirect to "My Committees" page

**3. Check Browser Console**
- Open DevTools (F12)
- Go to Console tab
- Should see no errors
- Look for success messages

---

## 🐛 Still Not Working?

### Check These:

**1. Supabase Connection**
```typescript
// Check: src/environments/environment.ts
export const environment = {
  production: false,
  supabaseUrl: 'YOUR_URL_HERE', // Must be correct
  supabaseKey: 'YOUR_KEY_HERE'  // Must be correct
};
```

**2. User Authentication**
- Make sure you're logged in
- Check browser console for auth errors
- Try logging out and back in

**3. Database Permissions**
- Check RLS policies in Supabase
- Verify user has permission to insert committees
- Check Supabase logs for errors

**4. Browser Console Errors**
Open DevTools (F12) and look for:
- Red error messages
- Network errors (failed requests)
- Supabase errors

**5. Network Tab**
- Open DevTools → Network tab
- Try creating committee
- Look for failed requests (red)
- Click on failed request to see error details

---

## 📝 Quick SQL Commands

### Check if column exists:
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'committees' 
AND column_name = 'distribution_method';
```

### Add column manually:
```sql
ALTER TABLE committees 
ADD COLUMN distribution_method TEXT DEFAULT 'random' 
CHECK (distribution_method IN ('random', 'manual'));
```

### Check existing committees:
```sql
SELECT id, name, distribution_method, created_at 
FROM committees 
ORDER BY created_at DESC 
LIMIT 5;
```

### Check RLS policies:
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'committees';
```

---

## 💡 Prevention

To avoid this issue in the future:

1. **Always run migrations** when updating the codebase
2. **Check database schema** matches code expectations
3. **Test in development** before deploying
4. **Keep documentation** updated with required migrations

---

## 📞 Need More Help?

### Debug Steps:

**1. Check Server Logs**
Look at the terminal where `npm start` is running for errors.

**2. Check Browser Console**
```
F12 → Console tab → Look for errors
```

**3. Check Network Requests**
```
F12 → Network tab → Try creating committee → Check failed requests
```

**4. Check Supabase Logs**
```
Supabase Dashboard → Logs → Look for errors
```

### Common Error Messages:

**"column 'distribution_method' does not exist"**
→ Run database migration (Option 1)

**"Not authenticated"**
→ Log out and log back in

**"Permission denied"**
→ Check RLS policies in Supabase

**"Network error"**
→ Check Supabase URL and key in environment.ts

---

## ✅ Success Checklist

After fixing:
- [ ] Database migration completed
- [ ] Browser refreshed (F5)
- [ ] No console errors
- [ ] Create committee form loads
- [ ] Distribution method field visible
- [ ] Can select random or manual
- [ ] Submit button works
- [ ] Redirects to "My Committees"
- [ ] New committee appears in list

---

**Most Common Fix:** Run the database migration from `database-migrations/winner-selection-system.sql` in Supabase SQL Editor.

**Time to Fix:** 2-3 minutes

**Difficulty:** Easy ⭐
