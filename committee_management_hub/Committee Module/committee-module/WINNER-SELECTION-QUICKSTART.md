# Winner Selection System - Quick Start Guide

## 🚀 Quick Setup (5 Minutes)

### Step 1: Run Database Migration
```bash
# Copy and paste the SQL from database-migrations/winner-selection-system.sql
# into your Supabase SQL Editor and execute it
```

### Step 2: Verify Installation
The following files have been created:

**Services:**
- ✅ `src/app/core/winner-selection.service.ts`

**Components:**
- ✅ `src/app/shared/winner-selection/`
- ✅ `src/app/shared/winner-payment-details/`
- ✅ `src/app/shared/committee-announcement/`

**Pages:**
- ✅ `src/app/pages/winner-management/`

**Updated Files:**
- ✅ `src/app/core/committee.service.ts` (added distribution_method)
- ✅ `src/app/pages/create-committee/` (added distribution method selection)

### Step 3: Test the System

#### A. Create a Committee with Distribution Method
1. Navigate to "Create Committee"
2. Fill in committee details
3. Select distribution method (Random or Manual)
4. Submit the form

#### B. Select a Winner (Random Method)
```typescript
// In your component
import { WinnerSelectionService } from '../../core/winner-selection.service';

// Select random winner
const { data: winner, error } = await this.winnerService.selectRandomWinner(committeeId);

if (winner) {
  console.log('Winner selected:', winner.member_name);
}
```

#### C. Select a Winner (Manual Method)
```typescript
// Get eligible members
const { data: eligible } = await this.winnerService.getEligibleMembers(committeeId);

// Select a specific member
const { data: winner } = await this.winnerService.selectManualWinner(
  committeeId,
  eligible[0].id
);
```

## 📋 Usage in Templates

### Basic Winner Selection
```html
<app-winner-selection
  [committeeId]="committeeId"
  [distributionMethod]="'random'"
  [committeeName]="'My Committee'"
  (winnerSelected)="onWinnerSelected($event)"
/>
```

### Display Payment Details
```html
<app-winner-payment-details
  [userId]="winnerId"
  [winnerName]="'John Doe'"
  [cycleNumber]="1"
/>
```

### Show Announcements
```html
<app-committee-announcement
  [committeeId]="committeeId"
  [showHistory]="true"
/>
```

## 🎯 Common Use Cases

### Use Case 1: Committee Admin Selects Random Winner
```typescript
async selectWinner() {
  const { data, error } = await this.winnerService.selectRandomWinner(this.committeeId);
  
  if (error) {
    alert('Error: ' + error);
    return;
  }
  
  // Winner selected and announcement sent automatically
  console.log('Winner:', data.member_name);
}
```

### Use Case 2: Display Current Winner
```typescript
async loadCurrentWinner() {
  const { data } = await this.winnerService.getCurrentWinner(this.committeeId);
  this.currentWinner.set(data);
}
```

### Use Case 3: Check Eligible Members
```typescript
async checkEligible() {
  const { data } = await this.winnerService.getEligibleMembers(this.committeeId);
  console.log(`${data.length} eligible members`);
}
```

## 🔧 Configuration

### Distribution Method Options
```typescript
type DistributionMethod = 'random' | 'manual';
```

### Committee Form Data
```typescript
const formData: CommitteeFormData = {
  // ... other fields
  distributionMethod: 'random', // or 'manual'
};
```

## ✅ Validation Rules

1. **Eligible Members Only**
   - Must be approved committee members
   - Cannot have won previously

2. **One Winner Per Cycle**
   - Each cycle can only have one winner
   - Cycle numbers are sequential

3. **Admin Only**
   - Only committee owner can select winners

## 🎨 UI Components

### Winner Selection Card
- Shows eligible member count
- Random: Single button click
- Manual: Dropdown selection
- Loading states
- Success/error messages

### Payment Details Card
- Primary payment method badge
- JazzCash/Easypaisa numbers
- Bank account details
- Copy-to-clipboard buttons

### Announcement Card
- Current winner display
- Winner history list
- Cycle numbers
- Selection method badges

## 📱 Responsive Design

All components are fully responsive:
- Mobile: Single column layout
- Tablet: Adaptive grid
- Desktop: Two-column layout

## 🔐 Security

### RLS Policies Applied
- ✅ Members can view winners for their committees
- ✅ Only owners can select winners
- ✅ Payment details visible to members only

### Access Control
- ✅ Winner selection restricted to admin
- ✅ Duplicate prevention at database level
- ✅ Eligible members filtered automatically

## 🐛 Troubleshooting

### Problem: "No eligible members"
**Solution:** Ensure committee has approved members who haven't won yet.

### Problem: "Permission denied"
**Solution:** Verify user is the committee owner.

### Problem: Payment details not showing
**Solution:** Winner must have set up payment methods in their profile.

## 📚 Next Steps

1. ✅ Run database migration
2. ✅ Test committee creation with distribution method
3. ✅ Test winner selection (both methods)
4. ✅ Verify announcements are sent
5. ✅ Check payment details display
6. ✅ Test with multiple cycles

## 🎓 Learn More

- Full documentation: `WINNER-SELECTION-README.md`
- Database schema: `database-migrations/winner-selection-system.sql`
- Component examples: `src/app/pages/winner-management/`

## 💡 Tips

1. **Start with Random Selection** - Easier to test and implement
2. **Test with Sample Data** - Create test committees and members
3. **Check Browser Console** - Helpful for debugging
4. **Use Supabase Dashboard** - Monitor database changes
5. **Test RLS Policies** - Verify security with different users

## 🚦 Status Indicators

### Committee Creation
- 🟢 Distribution method field added
- 🟢 Validation working
- 🟢 Form submission includes method

### Winner Selection
- 🟢 Random selection working
- 🟢 Manual selection working
- 🟢 Announcements sent automatically

### Payment Details
- 🟢 Details displayed correctly
- 🟢 Copy-to-clipboard working
- 🟢 Responsive layout

### Announcements
- 🟢 Current winner shown
- 🟢 History displayed
- 🟢 Real-time updates

---

**Ready to go!** 🎉

Start by creating a committee with a distribution method, then select your first winner!
