# 🔧 Fix: Payment Methods Not Showing

## ❌ Issue:

Winner is selected (Maida Amjad) but the message shows:
```
"The winner hasn't set up their payment methods yet"
```

Even though the winner has added payment details.

---

## ✅ Solution: Create Payment Methods Table

The `payment_methods` table might not exist or the policies aren't set up correctly.

---

## 🚀 Quick Fix Steps

### Step 1: Open Supabase Dashboard

1. Go to: **https://supabase.com**
2. Login to your account
3. Select your project

### Step 2: Open SQL Editor

1. Click **"SQL Editor"** in the left sidebar
2. Click **"New Query"**

### Step 3: Run This SQL

**Copy and paste this entire script:**

```sql
-- Create payment_methods table
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  jazzcash_number TEXT,
  easypaisa_number TEXT,
  bank_account_number TEXT,
  bank_name TEXT,
  account_title TEXT,
  primary_method TEXT CHECK (primary_method IN ('jazzcash', 'easypaisa', 'bank')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_payment_methods_user 
ON public.payment_methods(user_id);

-- Enable RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can insert their own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can update their own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can delete their own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Committee members can view winner payment methods" ON public.payment_methods;

-- Policy: Users can view their own payment methods
CREATE POLICY "Users can view their own payment methods"
ON public.payment_methods FOR SELECT
USING (user_id = auth.uid());

-- Policy: Users can insert their own payment methods
CREATE POLICY "Users can insert their own payment methods"
ON public.payment_methods FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own payment methods
CREATE POLICY "Users can update their own payment methods"
ON public.payment_methods FOR UPDATE
USING (user_id = auth.uid());

-- Policy: Users can delete their own payment methods
CREATE POLICY "Users can delete their own payment methods"
ON public.payment_methods FOR DELETE
USING (user_id = auth.uid());

-- Policy: Committee members can view payment methods of winners
CREATE POLICY "Committee members can view winner payment methods"
ON public.payment_methods FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.winner_selections ws
    INNER JOIN public.committee_members cm ON cm.user_id = payment_methods.user_id
    WHERE cm.id = ws.member_id
      AND ws.committee_id IN (
        SELECT committee_id 
        FROM public.committee_members 
        WHERE user_id = auth.uid()
      )
  )
);
```

### Step 4: Click Run

1. Click **"Run"** button (or Ctrl+Enter)
2. Wait for: ✅ **"Success. No rows returned"**

### Step 5: Verify Maida's Payment Details

Now check if Maida Amjad has actually added payment details:

1. In Supabase, go to **"Table Editor"**
2. Find **"payment_methods"** table
3. Look for Maida's user_id
4. Check if there's a record with payment details

**If NO record exists:**
- Maida needs to add payment details
- Go to: Profile → Payment Methods
- Add JazzCash, Easypaisa, or Bank details

**If record EXISTS but empty:**
- The fields might be NULL
- Maida needs to fill in the details

### Step 6: Refresh Your App

1. Go to: **http://localhost:4200/**
2. Press: **Ctrl + Shift + R**
3. Go to: **Payments** page
4. Click on: **"THIS MONTH'S WINNER"**
5. Should now show: **Payment details!** 💳

---

## 🔍 Debug: Check If Payment Details Exist

### In Supabase SQL Editor, run:

```sql
-- Step 1: Check if payment_methods table exists
SELECT * FROM public.payment_methods;

-- Step 2: Check Maida's payment details specifically
SELECT 
  pm.*,
  u.email
FROM public.payment_methods pm
JOIN auth.users u ON u.id = pm.user_id
WHERE u.email = 'maidaamjad32@gmail.com';

-- Step 3: Check the winner_selections table
SELECT * FROM public.winner_selections 
ORDER BY created_at DESC 
LIMIT 5;

-- Step 4: Check if winner's user_id matches payment_methods
SELECT 
  ws.member_name,
  ws.member_email,
  cm.user_id as member_user_id,
  pm.jazzcash_number,
  pm.easypaisa_number,
  pm.bank_account_number,
  pm.primary_method
FROM public.winner_selections ws
JOIN public.committee_members cm ON cm.id = ws.member_id
LEFT JOIN public.payment_methods pm ON pm.user_id = cm.user_id
ORDER BY ws.created_at DESC
LIMIT 1;
```

**Expected Result:**
- Step 1: Should show all payment methods
- Step 2: Should show Maida's payment details
- Step 3: Should show recent winners
- Step 4: Should show winner with their payment details linked
- If Step 4 shows NULL for payment fields, Maida needs to add them

---

## 🎯 How to Add Payment Details

### For Maida Amjad (or any winner):

1. **Login to the app**
2. **Go to Profile** (click profile icon)
3. **Click "Payment Methods"** or "Setup Payment"
4. **Fill in the form:**
   - JazzCash Number: e.g., 03001234567
   - Easypaisa Number: e.g., 03009876543
   - Bank Account Number: e.g., 1234567890123
   - Bank Name: e.g., HBL, UBL, MCB
   - Account Title: e.g., Maida Amjad
   - Primary Method: Select one (JazzCash, Easypaisa, or Bank)
5. **Click Save**

### After Saving:

1. Go back to **Payments** page
2. Click on **"THIS MONTH'S WINNER"**
3. Should now show: **All payment details with copy buttons!** 🎉

---

## ✅ Success Indicators

After running the SQL and adding payment details:

### In Payments Page:
```
💳 Winner Information

✓ Primary: JazzCash

📱 JazzCash
03001234567          [Copy]

📱 Easypaisa
03009876543          [Copy]

🏦 HBL Bank
1234567890123        [Copy]
Maida Amjad
```

---

## 🐛 Troubleshooting

### Issue: Still shows "hasn't set up payment methods"

**Check:**
1. Payment methods table exists
2. Maida has a record in payment_methods table
3. Record has actual values (not NULL)
4. RLS policies allow viewing

**Solution:**
```sql
-- Check if record exists
SELECT * FROM public.payment_methods 
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'maidaamjad32@gmail.com'
);

-- If no record, Maida needs to add payment details
-- If record exists but fields are NULL, she needs to fill them in
```

### Issue: "permission denied" when viewing payment details

**Solution:**
- Run the policy SQL again
- Make sure "Committee members can view winner payment methods" policy exists
- Check that you're a member of the same committee

### Issue: Payment details show but copy button doesn't work

**Solution:**
- App needs to be on HTTPS for clipboard API
- Or use localhost (which is allowed)
- Check browser console for errors

---

## 📊 Database Structure

### payment_methods table should have:
- **id** - UUID
- **user_id** - UUID (references auth.users)
- **jazzcash_number** - TEXT
- **easypaisa_number** - TEXT
- **bank_account_number** - TEXT
- **bank_name** - TEXT
- **account_title** - TEXT
- **primary_method** - TEXT ('jazzcash', 'easypaisa', 'bank')
- **created_at** - TIMESTAMPTZ
- **updated_at** - TIMESTAMPTZ

---

## 🎉 After Fix

Once everything is set up:

1. ✅ Winner selected (Maida Amjad)
2. ✅ Payment details added by winner
3. ✅ Payments page shows payment details
4. ✅ Copy buttons work
5. ✅ All members can see winner's payment info
6. ✅ Members can copy details to make payment

---

**Run the SQL now, then have Maida add her payment details, and it will work!** 🚀
