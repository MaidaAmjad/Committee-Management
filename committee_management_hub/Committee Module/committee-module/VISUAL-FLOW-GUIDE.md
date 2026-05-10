# 🎨 Visual Flow Guide - Shared Groups

## 📊 Complete Flow Diagrams

---

## 1️⃣ Shared Group Creation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER: ALIZA                              │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Browse Committees → Find "Final test"                      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Toggle "Join as Shared Group" → Click "Join as Shared"    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  SYSTEM: Get user's committee_member ID                     │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  DATABASE: Insert into shared_groups table                  │
│  - committee_id: "Final test"                               │
│  - group_leader_member_id: Aliza's member ID                │
│  - status: 'pending'                                        │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  ✅ SUCCESS: Shared group created!                          │
│  - Aliza is the Leader                                      │
│  - Status: "Pending Member"                                 │
│  - Waiting for second member                                │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  USER REFRESHES PAGE (Ctrl + F5)                            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  SYSTEM: Load from database                                 │
│  - Query shared_groups table                                │
│  - Find groups where Aliza is leader or member              │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  ✅ RESULT: Shared group still there!                       │
│  - Shows in "Shared Groups" page                            │
│  - Persists forever                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 2️⃣ Second Member Joining Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER: AMNA                               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Browse Committees → Find "Final test"                      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Toggle "Join as Shared Group" → Click "Join as Shared"    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  SYSTEM: Check if shared group exists for this committee    │
│  - Find Aliza's pending shared group                        │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  SYSTEM: Get Amna's committee_member ID                     │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  DATABASE: Update shared_groups table                       │
│  - group_member_member_id: Amna's member ID                 │
│  - status: 'active'                                         │
│  - updated_at: NOW()                                        │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  ✅ SUCCESS: Amna joined shared group!                      │
│  - Aliza: Leader                                            │
│  - Amna: Member                                             │
│  - Status: "Active"                                         │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  BOTH USERS REFRESH PAGE                                    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  ✅ RESULT: Both see each other!                            │
│  - Aliza sees: "You are the Leader" + Amna as member        │
│  - Amna sees: Aliza as Leader + "You are a Member"          │
└─────────────────────────────────────────────────────────────┘
```

---

## 3️⃣ Random Winner Selection Flow (Shared Group)

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN                                    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Go to Committee Details → "Final test"                     │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Click "Select Random Winner"                               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  SYSTEM: Get eligible members                               │
│  - All approved members                                     │
│  - Exclude previous winners                                 │
│  - Result: [Aliza, Amna, John, Sarah, ...]                  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  SYSTEM: Pick random member                                 │
│  - Random selection: AMNA                                   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  SYSTEM: Check if Amna is in shared group                   │
│  - Call: get_shared_group_for_member()                      │
│  - Result: YES - Shared group with Aliza                    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  🎯 CONSOLE LOG:                                            │
│  "Selected member is part of shared group,                  │
│   selecting both members as winners"                        │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  SYSTEM: Get shared group details                           │
│  - Leader: Aliza (user_id: xxx)                             │
│  - Member: Amna (user_id: yyy)                              │
│  - Group ID: zzz                                            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  DATABASE: Clear previous payment proofs                    │
│  - DELETE FROM payment_proofs WHERE committee_id = ...      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  DATABASE: Insert winner record                             │
│  - member_name: "Aliza & Amna (Shared Group)"               │
│  - is_shared_group: true                                    │
│  - shared_group_id: zzz                                     │
│  - payment_details_user_id: Aliza's user_id                 │
│  - cycle_number: 1                                          │
│  - selection_method: 'random'                               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  ✅ SUCCESS: Both members selected as winners!              │
│  - Winner display: "Aliza & Amna (Shared Group)"            │
│  - Payment details: Only Aliza's (group leader)             │
│  - Both excluded from future selections                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 4️⃣ Payment Details Display Flow

```
┌─────────────────────────────────────────────────────────────┐
│  USER: Go to Payments Page                                  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  SYSTEM: Load winner information                            │
│  - Query: winner_selections table                           │
│  - Find current winner for committee                        │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  SYSTEM: Check is_shared_group flag                         │
│  - is_shared_group: true                                    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  SYSTEM: Get payment_details_user_id                        │
│  - payment_details_user_id: Aliza's user_id                 │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  DATABASE: Fetch payment methods                            │
│  - Query: payment_methods table                             │
│  - WHERE user_id = Aliza's user_id                          │
│  - Result: Aliza's payment methods only                     │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  ✅ DISPLAY:                                                │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 🏆 Winner: Aliza & Amna (Shared Group)                │ │
│  │                                                        │ │
│  │ 💳 Payment Details (Group Leader: Aliza)              │ │
│  │                                                        │ │
│  │ JazzCash: 03001234567                                 │ │
│  │ Easypaisa: 03009876543                                │ │
│  │ Bank: HBL - 1234567890                                │ │
│  │                                                        │ │
│  │ ℹ️ Note: Payment to Group Leader (split 50/50)        │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 5️⃣ Database State Transitions

### Initial State (No Shared Group)
```
┌─────────────────────────────────────────────────────────────┐
│  shared_groups table: EMPTY                                 │
│  ┌────┬──────────────┬────────┬────────┬────────┐          │
│  │ id │ committee_id │ leader │ member │ status │          │
│  ├────┼──────────────┼────────┼────────┼────────┤          │
│  │    │              │        │        │        │          │
│  └────┴──────────────┴────────┴────────┴────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### After Aliza Creates Shared Group
```
┌─────────────────────────────────────────────────────────────┐
│  shared_groups table:                                       │
│  ┌────┬──────────────┬────────┬────────┬─────────┐         │
│  │ id │ committee_id │ leader │ member │ status  │         │
│  ├────┼──────────────┼────────┼────────┼─────────┤         │
│  │ 1  │ Final test   │ Aliza  │ NULL   │ pending │         │
│  └────┴──────────────┴────────┴────────┴─────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### After Amna Joins
```
┌─────────────────────────────────────────────────────────────┐
│  shared_groups table:                                       │
│  ┌────┬──────────────┬────────┬────────┬────────┐          │
│  │ id │ committee_id │ leader │ member │ status │          │
│  ├────┼──────────────┼────────┼────────┼────────┤          │
│  │ 1  │ Final test   │ Aliza  │ Amna   │ active │          │
│  └────┴──────────────┴────────┴────────┴────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### After Winner Selection
```
┌─────────────────────────────────────────────────────────────┐
│  winner_selections table:                                   │
│  ┌────┬──────────────┬─────────────────┬──────┬──────────┐ │
│  │ id │ committee_id │ member_name     │cycle │is_shared │ │
│  ├────┼──────────────┼─────────────────┼──────┼──────────┤ │
│  │ 1  │ Final test   │ Aliza & Amna    │  1   │   true   │ │
│  │    │              │ (Shared Group)  │      │          │ │
│  └────┴──────────────┴─────────────────┴──────┴──────────┘ │
│                                                             │
│  Additional columns:                                        │
│  - shared_group_id: 1                                       │
│  - payment_details_user_id: Aliza's user_id                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 6️⃣ Decision Tree: Winner Selection

```
                    Admin Selects Winner
                            │
                            ↓
                    Get Eligible Members
                            │
                            ↓
                    Select Random/Manual
                            │
                            ↓
                ┌───────────┴───────────┐
                │                       │
         Is Shared Group?        Is Shared Group?
              YES                      NO
                │                       │
                ↓                       ↓
    ┌───────────────────────┐   ┌──────────────┐
    │ Get Shared Group Info │   │ Single Winner│
    │ - Leader: Aliza       │   │ - One member │
    │ - Member: Amna        │   │ - Their      │
    │ - Group ID            │   │   payment    │
    └───────────┬───────────┘   │   details    │
                │               └──────────────┘
                ↓
    ┌───────────────────────┐
    │ Insert Winner Record  │
    │ - Both names          │
    │ - is_shared_group:true│
    │ - Leader's payment ID │
    └───────────┬───────────┘
                │
                ↓
    ┌───────────────────────┐
    │ ✅ Both Members Win!  │
    │ - Aliza & Amna        │
    │ - Leader's payment    │
    │ - Both excluded next  │
    └───────────────────────┘
```

---

## 7️⃣ User Experience Flow

### Aliza's View
```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Create Shared Group                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Committee: Final test                                 │  │
│  │ [x] Join as Shared Group                              │  │
│  │ [Join as Shared] ← Click                              │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: View Shared Groups Page                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 📋 My Shared Groups                                   │  │
│  │                                                        │  │
│  │ Committee: Final test                                 │  │
│  │ Status: Pending Member                                │  │
│  │ You are the Leader                                    │  │
│  │ Waiting for second member...                          │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: After Amna Joins (Refresh Page)                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 📋 My Shared Groups                                   │  │
│  │                                                        │  │
│  │ Committee: Final test                                 │  │
│  │ Status: Active ✅                                     │  │
│  │ You are the Leader                                    │  │
│  │ Partner: Amna                                         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Amna's View
```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Join Existing Shared Group                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Committee: Final test                                 │  │
│  │ [x] Join as Shared Group                              │  │
│  │ [Join as Shared] ← Click                              │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: View Shared Groups Page                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 📋 My Shared Groups                                   │  │
│  │                                                        │  │
│  │ Committee: Final test                                 │  │
│  │ Status: Active ✅                                     │  │
│  │ Leader: Aliza                                         │  │
│  │ You are a Member                                      │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways

### ✅ What Happens When Shared Group Member is Selected:

1. **System detects** shared group membership
2. **Both members** are marked as winners
3. **Winner name** shows: "Aliza & Amna (Shared Group)"
4. **Payment details** show only Aliza's (group leader)
5. **Both members** excluded from future selections

### ✅ What Persists in Database:

1. **Shared group** record with leader and member
2. **Winner selection** record with shared group flag
3. **Payment details** reference to group leader
4. **All data** survives page refreshes

### ✅ What Users See:

1. **Aliza** sees: "You are the Leader" + Amna as partner
2. **Amna** sees: Aliza as Leader + "You are a Member"
3. **Admin** sees: "Aliza & Amna (Shared Group)" as winner
4. **All members** see only Aliza's payment details

---

**Visual guide complete!** 🎨

Use these diagrams to understand the complete flow of shared groups!
