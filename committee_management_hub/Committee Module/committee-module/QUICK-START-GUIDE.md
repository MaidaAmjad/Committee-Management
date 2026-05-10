# 🚀 Quick Start Guide - Shared Groups

## ⚡ 3-Step Setup

### Step 1: Run Database Migration (5 minutes)

1. Open **Supabase Dashboard**
2. Go to **SQL Editor**
3. Copy entire script from: `database-migrations/create-shared-groups-table.sql`
4. Click **Run**
5. ✅ Wait for success message

### Step 2: Compile Application (2 minutes)

```bash
cd "committee_management_hub/Committee Module/committee-module"
npm run build
```

### Step 3: Hard Refresh Browser

Press **Ctrl + Shift + R**

---

## 🧪 Quick Test (5 minutes)

### Test Shared Group Creation

1. **Login as Aliza**
2. **Browse Committees** → "Final test"
3. **Toggle "Join as Shared Group"**
4. **Click "Join as Shared"**
5. ✅ Shared group created

### Test Persistence

1. **Refresh page** (Ctrl + F5)
2. **Go to "Shared Groups"**
3. ✅ Group still there!

### Test Second Member

1. **Login as Amna**
2. **Browse Committees** → "Final test"
3. **Toggle "Join as Shared Group"**
4. **Click "Join as Shared"**
5. ✅ Joins Aliza's group

### Test Winner Selection

1. **Login as Admin**
2. **Go to Committee Details** → "Final test"
3. **Click "Select Random Winner"**
4. **If Aliza or Amna selected:**
   - ✅ Shows: "Aliza & Amna (Shared Group)"
   - ✅ Only Aliza's payment details shown

---

## ✅ What's Working Now

- ✅ Shared groups persist across page refreshes
- ✅ Second member can join and data persists
- ✅ Winner selection detects shared groups automatically
- ✅ Both members marked as winners
- ✅ Only group leader's payment details shown
- ✅ Shared groups excluded from future selections

---

## 🐛 If Something Goes Wrong

### Shared groups not showing after refresh?
→ Run database migration in Supabase

### Winner selection not detecting shared group?
→ Check console logs (F12) for errors

### Payment details showing wrong member?
→ Verify group leader is correct in database

---

## 📞 Quick Commands

### Check Shared Groups in Database
```sql
SELECT * FROM shared_groups;
```

### Check Winner Selections
```sql
SELECT * FROM winner_selections WHERE is_shared_group = true;
```

### Rebuild Application
```bash
npm run build
```

---

## 🎯 Expected Console Logs

When selecting shared group winner:
```
🎯 Selected member is part of shared group, selecting both members as winners
```

When loading shared groups:
```
🔍 Fetching shared groups for user: [user-id]
👤 My member IDs: [member-1, member-2]
✅ Found 1 shared groups in database
✅ Returning 1 enriched groups
```

---

**Ready to test? Run the database migration and start testing!** 🚀
