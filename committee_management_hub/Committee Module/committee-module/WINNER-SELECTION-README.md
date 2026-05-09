# Committee Winner Distribution Method System

## Overview

This system allows committee admins to choose how monthly committee winners are selected. It supports two distribution methods:

1. **Random Selection** - System automatically selects a random eligible member
2. **Manual Selection** - Admin manually chooses the winner from eligible members

## Features

### ✅ Distribution Method Selection
- Choose distribution method during committee creation
- Selection is fixed for the entire committee cycle
- Clear UI with radio buttons showing method descriptions

### ✅ Random Selection Method
- Automatic random winner generation
- Fair and unbiased selection process
- System prevents duplicate selections
- Automatic notifications to all members

### ✅ Manual Selection Method
- Admin selects winner from dropdown
- Only eligible members shown (haven't won yet)
- Flexible control over winner selection
- Automatic notifications after selection

### ✅ Winner Announcements
- Automatic broadcast to all committee members
- Displays winner name, cycle number, and selection method
- Shows winner history with all past selections
- Real-time updates

### ✅ Payment Details Display
- Winner's payment methods automatically displayed
- Shows JazzCash, Easypaisa, and Bank Account details
- Primary payment method highlighted
- Copy-to-clipboard functionality
- Visible only to committee members and admin

### ✅ Committee Details Integration
- Distribution method displayed on committee page
- Current winner information
- Winner payment details section
- Announcement history

## Components

### 1. WinnerSelectionComponent
**Location:** `src/app/shared/winner-selection/`

Handles winner selection based on distribution method.

**Inputs:**
- `committeeId: string` - Committee ID
- `distributionMethod: 'random' | 'manual'` - Selection method
- `committeeName: string` - Committee name

**Outputs:**
- `winnerSelected: EventEmitter<WinnerSelection>` - Emits when winner is selected

**Features:**
- Random selection button for random method
- Dropdown selection for manual method
- Eligible members count display
- Loading and error states
- Success notifications

### 2. WinnerPaymentDetailsComponent
**Location:** `src/app/shared/winner-payment-details/`

Displays payment information for the selected winner.

**Inputs:**
- `userId: string` - Winner's user ID
- `winnerName: string` - Winner's name
- `cycleNumber: number` - Current cycle number

**Features:**
- Primary payment method badge
- JazzCash number display
- Easypaisa number display
- Bank account details
- Copy-to-clipboard buttons
- Responsive card layout

### 3. CommitteeAnnouncementComponent
**Location:** `src/app/shared/committee-announcement/`

Shows current winner announcement and history.

**Inputs:**
- `committeeId: string` - Committee ID
- `showHistory: boolean` - Whether to show winner history

**Features:**
- Current winner card with celebration design
- Selection method display
- Winner history list
- Cycle number badges
- Formatted dates

### 4. WinnerManagementPage
**Location:** `src/app/pages/winner-management/`

Comprehensive admin page for managing winners.

**Features:**
- Committee information display
- Distribution method badge
- Winner selection interface
- Payment details display
- Instructions card
- Two-column responsive layout

## Services

### WinnerSelectionService
**Location:** `src/app/core/winner-selection.service.ts`

Handles all winner selection operations.

**Key Methods:**

```typescript
// Get eligible members (haven't won yet)
getEligibleMembers(committeeId: string): Promise<{data: EligibleMember[], error: string | null}>

// Select random winner
selectRandomWinner(committeeId: string): Promise<{data: WinnerSelection | null, error: string | null}>

// Manually select winner
selectManualWinner(committeeId: string, memberId: string): Promise<{data: WinnerSelection | null, error: string | null}>

// Get current cycle winner
getCurrentWinner(committeeId: string): Promise<{data: WinnerSelection | null, error: string | null}>

// Get all winners
getAllWinners(committeeId: string): Promise<{data: WinnerSelection[], error: string | null}>

// Get winner payment details
getWinnerPaymentDetails(userId: string): Promise<{data: WinnerPaymentDetails | null, error: string | null}>

// Send winner announcement
sendWinnerAnnouncement(committeeId: string, winnerName: string, cycleNumber: number, method: DistributionMethod): Promise<{error: string | null}>
```

## Database Schema

### committees table (updated)
```sql
ALTER TABLE committees 
ADD COLUMN distribution_method TEXT DEFAULT 'random' 
CHECK (distribution_method IN ('random', 'manual'));
```

### winner_selections table (new)
```sql
CREATE TABLE winner_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID NOT NULL REFERENCES committees(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES committee_members(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  member_email TEXT NOT NULL,
  cycle_number INTEGER NOT NULL,
  selected_at TIMESTAMPTZ DEFAULT NOW(),
  selection_method TEXT NOT NULL CHECK (selection_method IN ('random', 'manual')),
  selected_by TEXT NOT NULL,
  
  UNIQUE(committee_id, cycle_number),
  UNIQUE(committee_id, member_id),
  CHECK (cycle_number > 0)
);
```

## Installation & Setup

### 1. Run Database Migration

```bash
# Execute the SQL migration file
psql -U your_user -d your_database -f database-migrations/winner-selection-system.sql
```

Or use Supabase SQL Editor to run the migration.

### 2. Update Committee Service

The `CommitteeService` has been updated to include `distribution_method` in:
- `CommitteeFormData` interface
- `Committee` interface
- `createCommittee()` method

### 3. Update Create Committee Form

The create committee form now includes distribution method selection with:
- Radio button options
- Visual cards for each method
- Clear descriptions
- Validation

### 4. Import Components

Import the new components where needed:

```typescript
import { WinnerSelectionComponent } from '../../shared/winner-selection/winner-selection';
import { WinnerPaymentDetailsComponent } from '../../shared/winner-payment-details/winner-payment-details';
import { CommitteeAnnouncementComponent } from '../../shared/committee-announcement/committee-announcement';
```

## Usage Examples

### Example 1: Create Committee with Random Selection

```typescript
const formData: CommitteeFormData = {
  name: 'Tech Savings Circle',
  monthlyAmount: 1000,
  maxMembers: 10,
  description: 'Monthly savings for tech enthusiasts',
  durationMonths: 12,
  paymentDeadlineDate: '2026-06-15',
  gracePeriodDays: 3,
  paymentCycleDays: 30,
  distributionMethod: 'random' // Random selection
};

await committeeService.createCommittee(formData);
```

### Example 2: Select Random Winner

```typescript
const { data: winner, error } = await winnerService.selectRandomWinner(committeeId);

if (winner) {
  console.log(`Winner: ${winner.member_name}, Cycle: ${winner.cycle_number}`);
  
  // Send announcement
  await winnerService.sendWinnerAnnouncement(
    committeeId,
    winner.member_name,
    winner.cycle_number,
    'random'
  );
}
```

### Example 3: Manual Winner Selection

```typescript
// Get eligible members
const { data: eligible } = await winnerService.getEligibleMembers(committeeId);

// Admin selects a member
const selectedMemberId = eligible[0].id;

// Select winner
const { data: winner, error } = await winnerService.selectManualWinner(
  committeeId,
  selectedMemberId
);
```

### Example 4: Display Winner in Template

```html
<!-- Winner Selection Component -->
<app-winner-selection
  [committeeId]="committee.id"
  [distributionMethod]="committee.distribution_method"
  [committeeName]="committee.name"
  (winnerSelected)="onWinnerSelected($event)"
/>

<!-- Winner Payment Details -->
@if (currentWinner) {
  <app-winner-payment-details
    [userId]="currentWinner.member_id"
    [winnerName]="currentWinner.member_name"
    [cycleNumber]="currentWinner.cycle_number"
  />
}

<!-- Announcements -->
<app-committee-announcement
  [committeeId]="committee.id"
  [showHistory]="true"
/>
```

## Validation Rules

### Winner Selection Rules
1. ✅ Only approved members are eligible
2. ✅ Members who already won cannot be selected again
3. ✅ One winner per cycle
4. ✅ Cycle numbers must be sequential
5. ✅ Only committee owner can select winners

### Distribution Method Rules
1. ✅ Must be selected during committee creation
2. ✅ Cannot be changed after committee is created
3. ✅ Must be either 'random' or 'manual'

## Security

### Row Level Security (RLS)
- Members can only view winners for committees they belong to
- Only committee owners can insert winner selections
- Payment details visible only to committee members

### Access Control
- Winner selection restricted to committee admin
- Eligible members list filtered by approval status
- Duplicate winner prevention at database level

## UI/UX Features

### Modern SaaS Design
- Clean card-based layouts
- Gradient headers with icons
- Responsive grid layouts
- Smooth transitions and hover effects
- Loading states with spinners
- Success/error notifications

### Color Scheme
- Primary: `#004ac6` (Blue)
- Success: `#16a34a` (Green)
- Warning: `#f59e0b` (Amber)
- Error: `#ba1a1a` (Red)
- Accent: `#ea580c` (Orange)

### Icons
Using Material Symbols Outlined:
- `emoji_events` - Winner/Trophy
- `shuffle` - Random selection
- `touch_app` - Manual selection
- `account_balance_wallet` - Payment details
- `phone_android` - Mobile payment
- `account_balance` - Bank transfer

## Testing Checklist

### Committee Creation
- [ ] Distribution method field appears in form
- [ ] Radio buttons work correctly
- [ ] Default selection is 'random'
- [ ] Form validation includes distribution method
- [ ] Committee created with correct distribution method

### Random Selection
- [ ] Only eligible members are considered
- [ ] Random selection is truly random
- [ ] Winner cannot be selected twice
- [ ] Announcement sent automatically
- [ ] Payment details displayed correctly

### Manual Selection
- [ ] Dropdown shows only eligible members
- [ ] Selected member becomes winner
- [ ] Validation prevents duplicate selection
- [ ] Announcement sent automatically
- [ ] Payment details displayed correctly

### Payment Details
- [ ] JazzCash number displays correctly
- [ ] Easypaisa number displays correctly
- [ ] Bank account details display correctly
- [ ] Primary method highlighted
- [ ] Copy-to-clipboard works
- [ ] Visible only to members

### Announcements
- [ ] Current winner displayed prominently
- [ ] Winner history shows all past winners
- [ ] Cycle numbers correct
- [ ] Selection method shown
- [ ] Dates formatted correctly

## Troubleshooting

### Issue: Winner selection fails
**Solution:** Check that:
1. User is the committee owner
2. There are eligible members available
3. Database migration was run successfully
4. RLS policies are enabled

### Issue: Payment details not showing
**Solution:** Check that:
1. Winner has set up payment methods
2. User is a committee member
3. Payment methods table exists
4. RLS policies allow access

### Issue: Duplicate winner error
**Solution:** This is expected behavior. The system prevents:
1. Same member winning twice
2. Multiple winners per cycle
3. Check winner_selections table for existing records

## Future Enhancements

### Potential Features
- [ ] Scheduled automatic winner selection
- [ ] Email notifications for winners
- [ ] SMS notifications via Twilio
- [ ] Winner selection history export
- [ ] Custom selection algorithms
- [ ] Winner preferences/priorities
- [ ] Multi-cycle winner scheduling
- [ ] Winner rotation patterns

## Support

For issues or questions:
1. Check this README
2. Review database migration logs
3. Check browser console for errors
4. Verify Supabase RLS policies
5. Test with sample data

## License

This system is part of the Committee Management Hub application.

---

**Version:** 1.0.0  
**Last Updated:** May 9, 2026  
**Author:** Committee Management Team
