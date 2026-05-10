# ✅ Winner Payment Proofs Access Control

## 🎯 Feature Overview

**Before:** Payment proofs were visible only to the committee admin.

**After:** Payment proofs are visible only to the **current winner** of the committee.

---

## 🔐 Access Control Logic

### Who Can See "View Payment Proofs" Button?

✅ **Current Winner** (e.g., Maida Amjad)
- Can see "View Payment Proofs" button
- Can view all payment proofs submitted by members
- Can accept/reject payment proofs
- Can download/view proof files

❌ **Other Members** (non-winners)
- Cannot see "View Payment Proofs" button
- Can only upload their own payment proofs
- Cannot view other members' proofs

❌ **Committee Admin** (if not the winner)
- Cannot see payment proofs
- Only the winner has access

---

## 🛠️ Implementation Details

### 1. Added Winner User ID Tracking

**Updated `PaymentCard` interface:**
```typescript
export interface PaymentCard {
  // ... existing fields
  winnerUserId: string | null; // NEW: Store winner's user_id
}
```

### 2. Store Winner User ID on Load

**In `ngOnInit()`:**
```typescript
if (winnerMember) {
  winnerUserId = winnerMember.user_id; // Store winner's user_id
  // ... fetch payment details
}
```

### 3. Added Winner Check Method

**New method in `payments.ts`:**
```typescript
isWinner(card: PaymentCard): boolean {
  return card.winnerUserId === this.currentUserId();
}
```

### 4. Updated HTML Template

**Changed button visibility:**
```html
<!-- Before: Only admin could see -->
@if (isAdmin(card)) {
  <button>View Payment Proofs</button>
}

<!-- After: Only winner can see -->
@if (isWinner(card)) {
  <button>View Payment Proofs</button>
}
```

**Changed proofs panel visibility:**
```html
<!-- Before -->
@if (isAdmin(card) && card.showProofsPanel) {

<!-- After -->
@if (isWinner(card) && card.showProofsPanel) {
```

---

## 📊 User Experience

### For Maida Amjad (Winner)

**Payments Page:**
```
┌─────────────────────────────────────┐
│ random amna                         │
│ You are the Admin                   │
├─────────────────────────────────────┤
│ MONTHLY AMOUNT    DUE DATE          │
│ $500              May 12, 2026      │
├─────────────────────────────────────┤
│ THIS MONTH'S WINNER                 │
│ 🏆 Maida Amjad                      │
│ Click to view details               │
├─────────────────────────────────────┤
│ 💳 Winner Information               │
│ [Payment details shown]             │
├─────────────────────────────────────┤
│ [📁 View Payment Proofs]  ← VISIBLE │
└─────────────────────────────────────┘
```

**When clicked:**
```
┌─────────────────────────────────────┐
│ 📄 Received Payment Proofs          │
├─────────────────────────────────────┤
│ 📷 Amna Shakeel                     │
│    screenshot.png                   │
│    [Submitted] [👁️] [✓] [✗]        │
├─────────────────────────────────────┤
│ 📷 Ali Hassan                       │
│    payment_proof.jpg                │
│    [Submitted] [👁️] [✓] [✗]        │
├─────────────────────────────────────┤
│ 📄 Sara Ahmed                       │
│    receipt.pdf                      │
│    [Submitted] [👁️] [✓] [✗]        │
└─────────────────────────────────────┘
```

### For Other Members (Non-Winners)

**Payments Page:**
```
┌─────────────────────────────────────┐
│ random amna                         │
│ Member                              │
├─────────────────────────────────────┤
│ MONTHLY AMOUNT    DUE DATE          │
│ $500              May 12, 2026      │
├─────────────────────────────────────┤
│ THIS MONTH'S WINNER                 │
│ 🏆 Maida Amjad                      │
│ Click to view details               │
├─────────────────────────────────────┤
│ 💳 Winner Information               │
│ [Payment details shown]             │
├─────────────────────────────────────┤
│ [📤 Upload Proof]  ← Can only upload│
└─────────────────────────────────────┘
```

**No "View Payment Proofs" button visible!**

---

## 🔄 Flow Diagram

```
User Opens Payments Page
         │
         ├─→ Load committees
         │
         ├─→ For each committee:
         │    │
         │    ├─→ Get current winner
         │    │
         │    ├─→ Get winner's user_id
         │    │
         │    └─→ Store in card.winnerUserId
         │
         └─→ Render cards
              │
              ├─→ If user_id === winnerUserId
              │    └─→ Show "View Payment Proofs" button
              │
              └─→ If user_id !== winnerUserId
                   └─→ Show "Upload Proof" button only
```

---

## 🎯 Key Features

### 1. Winner Can View All Proofs
- Winner sees all payment proofs from all members
- Can accept or reject each proof
- Can view/download proof files

### 2. Winner Can Accept/Reject Proofs
```html
@if (proof.status === 'submitted') {
  <button (click)="acceptProof(card, proof)">✓</button>
  <button (click)="rejectProof(card, proof)">✗</button>
}
```

### 3. Non-Winners Can Only Upload
- Non-winners only see upload button
- Cannot view other members' proofs
- Cannot see who has paid or not

### 4. Dynamic Winner Changes
- When a new winner is selected next cycle
- The "View Payment Proofs" button automatically moves to the new winner
- Previous winner loses access

---

## 🧪 Testing Scenarios

### Test 1: Winner Access
1. Login as **Maida Amjad** (current winner)
2. Go to **Payments** page
3. ✅ Should see "View Payment Proofs" button
4. Click button
5. ✅ Should see all payment proofs from all members
6. ✅ Should be able to accept/reject proofs

### Test 2: Non-Winner Access
1. Login as **Amna Shakeel** (admin but not winner)
2. Go to **Payments** page
3. ❌ Should NOT see "View Payment Proofs" button
4. ✅ Should only see "Upload Proof" button

### Test 3: Member Access
1. Login as any other member (not winner)
2. Go to **Payments** page
3. ❌ Should NOT see "View Payment Proofs" button
4. ✅ Should only see "Upload Proof" button

### Test 4: Winner Change
1. Select a new winner (e.g., Ali Hassan)
2. Login as **Ali Hassan**
3. ✅ Should now see "View Payment Proofs" button
4. Login as **Maida Amjad** (previous winner)
5. ❌ Should NOT see "View Payment Proofs" button anymore

---

## 📝 Files Changed

1. ✅ `src/app/pages/payments/payments.ts`
   - Added `winnerUserId` to `PaymentCard` interface
   - Store winner's user_id during initialization
   - Added `isWinner()` method

2. ✅ `src/app/pages/payments/payments.html`
   - Changed `isAdmin(card)` to `isWinner(card)` for button visibility
   - Changed proofs panel condition to check winner instead of admin

---

## 🚀 How to Test

1. **Refresh your app**: `Ctrl + Shift + R`

2. **Login as Maida Amjad** (current winner)
   - Go to Payments page
   - Should see "View Payment Proofs" button
   - Click it to see all proofs

3. **Login as Amna Shakeel** (admin)
   - Go to Payments page
   - Should NOT see "View Payment Proofs" button
   - Should only see "Upload Proof" button

4. **Login as any other member**
   - Go to Payments page
   - Should NOT see "View Payment Proofs" button
   - Should only see "Upload Proof" button

---

## 💡 Why This Design?

### Security & Privacy
- Only the winner needs to see payment proofs
- Winner is the one receiving the money
- Winner needs to verify payments before accepting

### Fairness
- Admin doesn't need to see proofs
- Members' payment details are private
- Only the beneficiary (winner) has access

### Simplicity
- Clear role: Winner = Payment Receiver
- Winner manages payment verification
- No confusion about who should check proofs

---

## 🎉 Summary

✅ **Winner** (Maida Amjad) → Can view all payment proofs
❌ **Admin** (Amna Shakeel) → Cannot view payment proofs
❌ **Other Members** → Cannot view payment proofs

**The winner is the only one who can see and manage payment proofs!** 🏆

---

**Refresh your app and test with different users to see the access control in action!** 🚀
