# 🔧 Fix: Payment Proofs Not Showing for Winner

## ❌ Issue

Winner (Maida Amjad) can see "View Payment Proofs" button, but when other members upload proofs, they don't show up in the list.

---

## ✅ Root Cause

The `payment_proofs` table either:
1. Doesn't exist yet
2. Has wrong structure (old schema)
3. Missing RLS policies for winner access

---

## 🚀 Solution: Create Payment Proofs Table

### Step 1: Open Supabase Dashboard

1. Go to: **https://supabase.com**
2. Login to your account
3. Select your project

### Step 2: Open SQL Editor

1. Click **"SQL Editor"** in the left sidebar
2. Click **"New Query"**

### Step 3: Run This SQL

**Copy and paste the entire script from:**
`database-migrations/create-payment-proofs-table.sql`

Or copy this:

```sql
-- Create payment_proofs table with correct structure
CREATE TABLE IF NOT EXISTS public.payment_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID NOT NULL REFERENCES public.committees(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uploader_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'pdf')),
  file_url TEXT NOT NULL,
  month_year TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_proofs_committee 
ON public.payment_proofs(committee_id);

CREATE INDEX IF NOT EXISTS idx_payment_proofs_uploader 
ON public.payment_proofs(uploader_id);

CREATE INDEX IF NOT EXISTS idx_payment_proofs_month 
ON public.payment_proofs(committee_id, month_year);

-- Enable RLS
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own payment proofs" ON public.payment_proofs;
DROP POLICY IF EXISTS "Current winners can view all payment proofs for their committee" ON public.payment_proofs;
DROP POLICY IF EXISTS "Users can submit their own payment proofs" ON public.payment_proofs;
DROP POLICY IF EXISTS "Current winners can update payment proof status" ON public.payment_proofs;

-- Policy: Users can view their own proofs
CREATE POLICY "Users can view their own payment proofs"
ON public.payment_proofs FOR SELECT
USING (uploader_id = auth.uid());

-- Policy: Winners can view all proofs for their committee
CREATE POLICY "Current winners can view all payment proofs for their committee"
ON public.payment_proofs FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.winner_selections ws
    INNER JOIN public.committee_members cm ON cm.id = ws.member_id
    WHERE ws.committee_id = payment_proofs.committee_id
      AND cm.user_id = auth.uid()
      AND ws.id = (
        SELECT id 
        FROM public.winner_selections 
        WHERE committee_id = payment_proofs.committee_id
        ORDER BY created_at DESC 
        LIMIT 1
      )
  )
);

-- Policy: Users can submit proofs
CREATE POLICY "Users can submit their own payment proofs"
ON public.payment_proofs FOR INSERT
WITH CHECK (uploader_id = auth.uid());

-- Policy: Winners can update proof status
CREATE POLICY "Current winners can update payment proof status"
ON public.payment_proofs FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.winner_selections ws
    INNER JOIN public.committee_members cm ON cm.id = ws.member_id
    WHERE ws.committee_id = payment_proofs.committee_id
      AND cm.user_id = auth.uid()
      AND ws.id = (
        SELECT id 
        FROM public.winner_selections 
        WHERE committee_id = payment_proofs.committee_id
        ORDER BY created_at DESC 
        LIMIT 1
      )
  )
);
```

### Step 4: Click Run

1. Click **"Run"** button (or Ctrl+Enter)
2. Wait for: ✅ **"Success. No rows returned"**

---

## 🧪 Test the Fix

### Test 1: Upload Proof as Member

1. **Login as Amna Shakeel** (or any non-winner member)
2. Go to **Payments** page
3. Click **"Upload Proof"**
4. Upload a screenshot or PDF
5. ✅ Should upload successfully

### Test 2: View Proofs as Winner

1. **Login as Maida Amjad** (current winner)
2. Go to **Payments** page
3. Click **"View Payment Proofs"**
4. ✅ Should see Amna's uploaded proof
5. ✅ Should see accept/reject buttons

### Test 3: Accept/Reject Proof

1. Still logged in as **Maida Amjad**
2. Click **✓ (Accept)** button on a proof
3. ✅ Status should change to "Accepted"
4. ✅ Badge should turn green

---

## 🔍 Verify Table Exists

Run this query in Supabase SQL Editor:

```sql
-- Check if table exists
SELECT * FROM public.payment_proofs;

-- Check RLS policies
SELECT 
  policyname, 
  cmd 
FROM pg_policies 
WHERE tablename = 'payment_proofs';
```

**Expected:**
- First query: Returns empty table or existing proofs
- Second query: Shows 4 policies:
  1. Users can view their own payment proofs
  2. Current winners can view all payment proofs for their committee
  3. Users can submit their own payment proofs
  4. Current winners can update payment proof status

---

## 📊 How It Works

### Upload Flow (Member)
```
Member uploads proof
    ↓
Saved to Supabase Storage
    ↓
Record created in payment_proofs table
    ↓
RLS allows member to see their own proof
```

### View Flow (Winner)
```
Winner clicks "View Payment Proofs"
    ↓
Query: SELECT * FROM payment_proofs WHERE committee_id = ?
    ↓
RLS checks: Is user the current winner?
    ↓
If YES: Return all proofs
    ↓
Display in proofs panel
```

### RLS Policy Logic
```sql
-- Check if current user is the winner
EXISTS (
  SELECT 1
  FROM winner_selections ws
  JOIN committee_members cm ON cm.id = ws.member_id
  WHERE ws.committee_id = payment_proofs.committee_id
    AND cm.user_id = auth.uid()  -- Current user
    AND ws.id = (
      -- Get most recent winner
      SELECT id FROM winner_selections 
      WHERE committee_id = payment_proofs.committee_id
      ORDER BY created_at DESC LIMIT 1
    )
)
```

---

## 🐛 Troubleshooting

### Issue: Still no proofs showing

**Check 1: Table exists?**
```sql
SELECT COUNT(*) FROM public.payment_proofs;
```
If error → Run create table SQL again

**Check 2: Proofs uploaded?**
```sql
SELECT * FROM public.payment_proofs 
WHERE committee_id = 'YOUR_COMMITTEE_ID';
```
If empty → Have members upload proofs

**Check 3: Winner selected?**
```sql
SELECT * FROM public.winner_selections 
ORDER BY created_at DESC LIMIT 1;
```
If empty → Select a winner first

**Check 4: RLS policies exist?**
```sql
SELECT policyname FROM pg_policies 
WHERE tablename = 'payment_proofs';
```
If less than 4 policies → Run policy SQL again

**Check 5: Storage bucket exists?**
- Go to Supabase → Storage
- Check if "payment-proofs" bucket exists
- If not, create it (Public: Yes)

---

## 📝 Expected Behavior After Fix

### As Winner (Maida Amjad):
```
Payments Page
    ↓
Click "View Payment Proofs"
    ↓
See list of all proofs:
  - Amna Shakeel - screenshot.png [Submitted] [👁️] [✓] [✗]
  - Ali Hassan - receipt.pdf [Submitted] [👁️] [✓] [✗]
  - Sara Ahmed - payment.jpg [Submitted] [👁️] [✓] [✗]
```

### As Member (Amna Shakeel):
```
Payments Page
    ↓
Click "Upload Proof"
    ↓
Upload file
    ↓
See "Proof Submitted ✅" badge
    ↓
Cannot see "View Payment Proofs" button
```

---

## ✅ Success Checklist

- [ ] payment_proofs table created
- [ ] 4 RLS policies created
- [ ] payment-proofs storage bucket exists
- [ ] Members can upload proofs
- [ ] Winner can see "View Payment Proofs" button
- [ ] Winner can see all uploaded proofs
- [ ] Winner can accept/reject proofs
- [ ] Non-winners cannot see proofs

---

## 🎉 Summary

The issue was that the `payment_proofs` table either didn't exist or had the wrong structure. After running the SQL migration:

✅ Table created with correct structure
✅ RLS policies allow winner to view all proofs
✅ RLS policies allow winner to accept/reject proofs
✅ Members can upload their proofs
✅ Winner can manage all proofs

**Run the SQL migration now, then test by uploading proofs and viewing them as the winner!** 🚀
