# Shared Committee Slot System - Implementation Guide

## Overview
This document explains the implementation of the shared committee slot system, which allows two users to share a single committee slot, each paying half the monthly contribution.

## Key Concepts

### Slot Types
- **Full Member**: Occupies 1.0 slot (pays full monthly amount)
- **Shared Member**: Occupies 0.5 slot (pays half monthly amount with a partner)

### Slot Calculation Examples

#### Case 1: Committee with 2 Total Slots
```
Admin (creator)     = 1.0 slot
Shared Member A     = 0.5 slot
─────────────────────────────
Total Used          = 1.5 slots
Remaining           = 0.5 slot
```
**Result**: Only shared joining allowed for next member

#### Case 2: Committee Becomes Full
```
Admin (creator)     = 1.0 slot
Shared Member A     = 0.5 slot
Shared Member B     = 0.5 slot (completes the shared group)
─────────────────────────────
Total Used          = 2.0 slots
Remaining           = 0 slots
```
**Result**: Committee is full

## Database Schema Changes

### committee_members Table
Added new columns:
```typescript
slot_type?: 'full' | 'shared'        // Type of slot occupied
shared_group_id?: string | null      // Reference to shared group
```

### Committee Interface
```typescript
interface Committee {
  // ... existing fields
  member_count?: number;              // Total number of members
  slots_used?: number;                // Total slots used (e.g., 1.5)
  has_partial_slot?: boolean;         // True if 0.5 slot available
}
```

## Implementation Details

### 1. Slot Calculation Logic
**File**: `committee.service.ts`

The `getAllCommittees()` method now:
- Fetches all approved members with their `slot_type`
- Calculates `slots_used` by summing:
  - Full members: +1.0 per member
  - Shared members: +0.5 per member
- Detects partial slots (when slots_used has .5 fractional part)

```typescript
// Example calculation
members.forEach(m => {
  const slotType = m.slot_type || 'full';
  if (slotType === 'shared') {
    slotsUsed += 0.5;
  } else {
    slotsUsed += 1.0;
  }
});
```

### 2. Browse Committees UI
**File**: `browse-committees.ts` & `browse-committees.html`

#### New Helper Methods
```typescript
getSlotsLeft(c: Committee): number
// Returns remaining slots (can be fractional like 0.5)

getSlotLabel(c: Committee): string
// Returns labels like "0.5 SLOT LEFT", "1 SLOT LEFT", etc.

canOnlyJoinAsShared(c: Committee): boolean
// Returns true when only 0.5 slot remains

isFullJoinDisabled(c: Committee): boolean
// Returns true when less than 1 full slot available
```

#### Visual Indicators
- **Badge Colors**:
  - Red (`#ffdad6`): No slots (full)
  - Orange (`#ffdbcd`): 0.5 or limited slots
  - Yellow (`#fef9c3`): Moderate slots
  - Blue (`#d0e1fb`): Plenty of slots

- **Progress Bar**: Shows actual slot usage (e.g., 1.5/2 = 75%)

- **Warning Message**: Displayed when only 0.5 slot remains

### 3. Join Logic
**File**: `browse-committees.ts`

#### Validation Rules
1. **Committee Full Check**: Prevents joining if `slotsLeft === 0`
2. **Partial Slot Enforcement**: Forces shared joining if `slotsLeft === 0.5`
3. **Full Member Restriction**: Blocks full joining if `slotsLeft < 1`

#### Join Flow
```typescript
async joinCommittee(c: Committee, event: Event) {
  // 1. Check if committee is full
  if (slotsLeft === 0) {
    show error: "Committee is full"
    return
  }
  
  // 2. Force shared joining for partial slots
  if (slotsLeft === 0.5 && !isSharedToggleOn) {
    show error: "Must join as Shared Group"
    auto-enable shared toggle
    return
  }
  
  // 3. Validate full member joining
  if (!isSharedToggleOn && slotsLeft < 1) {
    show error: "Not enough slots for full member"
    return
  }
  
  // 4. Process join request
  if (isSharedToggleOn) {
    await joinCommitteeAsShared(c.id)
    navigate to /shared-groups
  } else {
    await joinCommittee(c.id)
  }
}
```

### 4. Service Methods
**File**: `committee.service.ts`

#### New Method: joinCommitteeAsShared
```typescript
async joinCommitteeAsShared(
  committeeId: string, 
  sharedGroupId?: string
): Promise<{ error: string | null }> {
  // Inserts member with slot_type = 'shared'
  // Links to shared_group_id if provided
}
```

## UI/UX Features

### 1. Dynamic Slot Display
- Shows exact slot usage: "1.5 / 2 slots used"
- Highlights partial slots: "(0.5 slot available)"
- Color-coded badges for quick visual feedback

### 2. Smart Join Controls
- **Shared Toggle**: 
  - Auto-enabled when only 0.5 slot remains
  - Disabled (locked) when forced
  - Shows "(Required)" label

- **Join Button**:
  - Changes color based on join type
  - Shows "Full" when committee is full
  - Displays loading spinner during join

### 3. Warning Messages
When only 0.5 slot remains:
```
⚠️ Only 0.5 slot remains.
You must join as a Shared Group to fill this slot.
```

## Testing Scenarios

### Scenario 1: Normal Joining
```
Committee: 3 total slots
Used: 1 slot (admin)
Available: 2 slots
Action: User can join as full OR shared
```

### Scenario 2: Partial Slot Available
```
Committee: 2 total slots
Used: 1.5 slots (admin + 1 shared member)
Available: 0.5 slot
Action: User MUST join as shared (forced)
Result: Shared toggle auto-enabled and locked
```

### Scenario 3: Committee Full
```
Committee: 2 total slots
Used: 2 slots
Available: 0 slots
Action: Join button disabled, shows "Full"
```

### Scenario 4: Shared Group Completion
```
Initial: 1.5 slots used (0.5 available)
User A joins as shared: 2.0 slots used
Result: Committee becomes full automatically
```

## Backend Requirements

### Database Migration
Add columns to `committee_members` table:
```sql
ALTER TABLE committee_members 
ADD COLUMN slot_type VARCHAR(10) DEFAULT 'full',
ADD COLUMN shared_group_id UUID REFERENCES shared_groups(id);
```

### Validation Rules
1. Prevent joining if `slots_used >= max_members`
2. Enforce shared joining when `remaining_slots === 0.5`
3. Validate slot_type is either 'full' or 'shared'
4. Ensure shared_group_id exists when slot_type is 'shared'

## Future Enhancements

### 1. Committee Details Page
Show detailed slot breakdown:
```
Total Slots: 2
Used Slots: 1.5
Remaining: 0.5

Slot Breakdown:
├─ Admin → Full Slot (1.0)
├─ Shared Group A → Half Slot (0.5)
└─ Available → Half Slot (0.5)
```

### 2. Admin Dashboard
- View all committees with partial slots
- Monitor shared group completion rates
- Analytics on slot utilization

### 3. Notifications
- Alert when shared group needs second member
- Notify when committee reaches capacity
- Remind users to complete shared group setup

## Code Quality

### Modularity
- Slot calculation logic isolated in service layer
- UI logic separated in component methods
- Reusable helper functions

### Scalability
- Supports any number of max_members
- Handles fractional slot calculations
- Extensible for future slot types

### Maintainability
- Clear method names and comments
- Type-safe interfaces
- Consistent error handling

## Troubleshooting

### Issue: Slots not calculating correctly
**Solution**: Check that `slot_type` is set correctly in database

### Issue: Shared toggle not forcing
**Solution**: Verify `canOnlyJoinAsShared()` logic and `has_partial_slot` flag

### Issue: Progress bar incorrect
**Solution**: Ensure `slots_used` is calculated with 0.5 for shared members

## Summary

This implementation provides a robust shared slot system that:
✅ Accurately tracks slot usage (full and partial)
✅ Enforces joining restrictions based on availability
✅ Provides clear visual feedback to users
✅ Prevents overfilling committees
✅ Supports seamless shared group creation
✅ Maintains data integrity with proper validation

The system is production-ready and follows Angular best practices with TypeScript type safety.
