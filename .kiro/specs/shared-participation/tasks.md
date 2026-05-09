# Implementation Plan: Shared Participation

## Overview

Implement the Shared Participation feature as a set of Angular 17+ standalone components and a service, using mock/in-memory data first. The work is broken into five incremental steps: data models and service, the page component and routing, the payment card component, the invite modal, and finally wiring the join-committee toggle into the browse page and the nav item into the sidebar.

## Tasks

- [x] 1. Define TypeScript interfaces and create `SharedGroupService` with mock data
  - Create `src/app/core/shared-group.service.ts`
  - Declare all exported types: `SharedGroupStatus`, `IndividualPaymentStatus`, `SlotPaymentStatus`, `SharedGroupMember`, `SharedPaymentProof`, `SharedGroup`, `SharedGroupCard`
  - Seed an in-memory `mockGroups` array with at least two `SharedGroup` objects covering all status variants (`Pending Member`, `Active`) and both `Unpaid` / `Partially Paid` / `Paid` slot statuses
  - Implement all public methods listed in the design: `getMySharedGroups`, `createSharedGroup`, `inviteMember`, `acceptInvitation`, `declineInvitation`, `cancelInvitation`, `uploadProof`, `acceptProof`, `rejectProof`
  - Implement the three pure functions: `computeSlotPaymentStatus`, `computeIndividualContribution`, `computeWinnerShare`
  - Add inline JSDoc comments on every method explaining its purpose and return shape, consistent with `PaymentService` and `CommitteeService`
  - All methods return `{ data: T | null; error: string | null }` or `{ error: string | null }` — match the existing service contract
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 2.3, 2.4, 2.5, 3.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 6.1, 8.1, 8.2, 8.3, 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.4, 10.5_

  - [ ]* 1.1 Write property test for `computeIndividualContribution` (Property 4)
    - **Property 4: Individual Contribution Calculation** — for any positive `monthly_amount`, `computeIndividualContribution(monthly_amount)` returns exactly `monthly_amount / 2`
    - Use `fc.float({ min: 1, max: 10_000_000 })` as the arbitrary
    - Tag: `// Feature: shared-participation, Property 4: Individual contribution calculation`
    - **Validates: Requirements 3.1**

  - [ ]* 1.2 Write property test for `computeWinnerShare` (Property 10)
    - **Property 10: Winner Share Calculation** — for any positive `totalPayout`, `computeWinnerShare(totalPayout)` returns exactly `totalPayout / 2`
    - Use `fc.float({ min: 1, max: 100_000_000 })` as the arbitrary
    - Tag: `// Feature: shared-participation, Property 10: Winner share calculation`
    - **Validates: Requirements 6.1**

  - [ ]* 1.3 Write property test for `computeSlotPaymentStatus` (Property 3)
    - **Property 3: Slot Payment Status Aggregation** — for any combination of leader and member `IndividualPaymentStatus` values, the computed `slot_payment_status` satisfies the aggregation table in the design
    - Use `fc.record({ leaderStatus: fc.constantFrom('Unpaid','Submitted','Accepted','Rejected'), memberStatus: fc.constantFrom('Unpaid','Submitted','Accepted','Rejected') })`
    - Tag: `// Feature: shared-participation, Property 3: Slot payment status aggregation`
    - **Validates: Requirements 3.3, 3.4, 3.5, 5.1, 5.2, 5.3, 5.4**

  - [ ]* 1.4 Write property test for `createSharedGroup` — leader assignment (Property 1)
    - **Property 1: Shared Group Creation Sets Leader** — for any `userId` and `committeeId`, the returned `SharedGroup` has `group_leader.user_id === userId` and `group_member === null`
    - Use `fc.record({ userId: fc.uuid(), committeeId: fc.uuid() })`
    - Tag: `// Feature: shared-participation, Property 1: Shared group creation sets leader`
    - **Validates: Requirements 1.2, 1.3**

  - [ ]* 1.5 Write property test for `createSharedGroup` — one group per slot (Property 2)
    - **Property 2: One Shared Group Per Slot** — calling `createSharedGroup` for a `committeeId` that already has a group returns `{ error: 'Slot already occupied by a shared group' }` and leaves the original group unchanged
    - Use `fc.record({ committeeId: fc.uuid() })`
    - Tag: `// Feature: shared-participation, Property 2: One shared group per slot`
    - **Validates: Requirements 1.4**

  - [ ]* 1.6 Write property test for `uploadProof` — valid file associates correctly (Property 5)
    - **Property 5: Proof Upload Associates Correctly** — for any valid file (JPG/PNG/PDF ≤ 5MB) and member, the resulting `SharedPaymentProof` has `uploader_id === memberId`, `month_year` equals the current cycle, and the member's `payment_status` becomes `"Submitted"`
    - Use `fc.record({ userId: fc.uuid(), fileName: fc.string(), fileSize: fc.integer({ min: 1, max: 5 * 1024 * 1024 }) })`
    - Tag: `// Feature: shared-participation, Property 5: Proof upload associates correctly`
    - **Validates: Requirements 4.2, 4.3**

  - [ ]* 1.7 Write property test for `uploadProof` — invalid file rejected (Property 7)
    - **Property 7: File Validation Rejects Invalid Uploads** — any file with MIME type outside `{image/jpeg, image/png, application/pdf}` or size > 5MB is rejected with a descriptive error and no proof record is created
    - Use `fc.oneof(fc.record({ type: fc.constantFrom('text/plain','video/mp4','application/zip'), size: fc.integer({ min: 1 }) }), fc.record({ type: fc.constantFrom('image/jpeg','image/png','application/pdf'), size: fc.integer({ min: 5 * 1024 * 1024 + 1, max: 20 * 1024 * 1024 }) }))`
    - Tag: `// Feature: shared-participation, Property 7: File validation rejects invalid uploads`
    - **Validates: Requirements 4.4, 4.5**

  - [ ]* 1.8 Write property test for `acceptProof` / `rejectProof` — isolation (Property 6)
    - **Property 6: Proof Review Updates Only the Reviewed Member** — accepting or rejecting member A's proof leaves member B's `payment_status` unchanged
    - Use `fc.record({ groupId: fc.uuid(), memberId: fc.uuid() })`
    - Tag: `// Feature: shared-participation, Property 6: Proof review isolates member`
    - **Validates: Requirements 4.6, 4.7**

  - [ ]* 1.9 Write property test for trust score isolation (Property 9)
    - **Property 9: Trust Score Updates Are Isolated** — accepting or missing a payment by member A updates only member A's `trust_score`, leaving member B's `trust_score` unchanged
    - Use `fc.record({ group: sharedGroupArb })` where `sharedGroupArb` generates a valid `SharedGroup` with two members
    - Tag: `// Feature: shared-participation, Property 9: Trust score updates are isolated`
    - **Validates: Requirements 8.2, 8.3**

  - [ ]* 1.10 Write property test for invitation state transitions (Property 11)
    - **Property 11: Invitation State Transitions** — for any `SharedGroup` in `"Pending Member"` status, calling `declineInvitation` or `cancelInvitation` resets the group to `"Pending Member"` with `pending_invitee_email === null`
    - Use `fc.record({ group: pendingGroupArb })` where `pendingGroupArb` generates a `SharedGroup` with `status === 'Pending Member'`
    - Tag: `// Feature: shared-participation, Property 11: Invitation state transitions`
    - **Validates: Requirements 2.5, 9.3**

- [ ] 2. Checkpoint — verify service compiles and all property tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Create `SharedGroupComponent` page and register the `/shared-groups` route
  - Create `src/app/pages/shared-group/shared-group.ts` as a standalone component with selector `app-shared-group`
  - Declare signals: `groups = signal<SharedGroupCard[]>([])`, `loading = signal(true)`, `errorMsg = signal('')`, `activeModal = signal<string | null>(null)`
  - Inject `SharedGroupService` and `AuthService`; call `getMySharedGroups()` in `ngOnInit` after `await this.auth.ready`, following the same pattern as `PaymentsComponent`
  - Create `src/app/pages/shared-group/shared-group.html` — layout mirrors `payments.html`: `app-sidebar` + `app-topnav` + main content area with page header, error banner, loading skeletons (4 skeleton cards), empty state, and a `grid grid-cols-1 lg:grid-cols-2 gap-6` card grid
  - Create `src/app/pages/shared-group/shared-group.scss` (empty or minimal, consistent with other page SCSS files)
  - Add the route to `src/app/app.routes.ts`:
    ```typescript
    {
      path: 'shared-groups',
      canActivate: [authGuard, paymentSetupGuard],
      loadComponent: () => import('./pages/shared-group/shared-group').then(m => m.SharedGroupComponent)
    }
    ```
  - _Requirements: 7.3, 7.4, 10.3_

- [x] 4. Add "Shared Groups" nav item to the sidebar
  - In `src/app/shared/sidebar/sidebar.ts`, add `{ label: 'Shared Groups', icon: 'group_work', route: '/shared-groups' }` to the `navItems` array, positioned after the `Payments` entry
  - _Requirements: 7.3_

- [ ] 5. Implement `SharedPaymentCardComponent`
  - Create `src/app/pages/shared-group/shared-payment-card.ts` as a standalone component with selector `app-shared-payment-card`
  - Declare `@Input() card!: SharedGroupCard` and `@Input() currentUserId!: string`
  - Declare all `@Output()` emitters: `inviteClicked`, `cancelInvite`, `uploadProof`, `acceptProof`, `rejectProof` — matching the signatures in the design
  - Create `src/app/pages/shared-group/shared-payment-card.html` implementing the full card layout:
    - Gradient header with group name and `slot_payment_status` badge (colour-coded: Paid = green, Partially Paid = amber, Unpaid = red/grey)
    - Two-column stats row: each member's `individual_contribution` in PKR and their `trust_score`
    - Member rows: Group Leader row and Group Member row (or "Awaiting Member" placeholder with a dashed border visual when `group_member` is null)
    - Per-member payment status badge and proof upload button (visible only to the relevant member, i.e. `currentUserId === member.user_id`)
    - "Invite Member" button visible only when `card.isLeader && card.group.group_member === null && card.group.status !== 'Pending Member'`
    - "Cancel Invite" button visible only when `card.isLeader && card.group.status === 'Pending Member'`
    - Pending invitation indicator (e.g. a yellow info banner) when `card.group.status === 'Pending Member'`
    - Winner distribution section (visually distinct, e.g. gold accent) shown only when `card.group.winner_payout` is set
    - Accept/reject proof controls shown only to the Group Leader for submitted proofs
  - Create `src/app/pages/shared-group/shared-payment-card.scss` (empty or minimal)
  - Import and render `SharedPaymentCardComponent` inside `SharedGroupComponent`'s template, passing `[card]` and `[currentUserId]` inputs and wiring all output events to handler methods on `SharedGroupComponent`
  - _Requirements: 2.1, 2.6, 3.2, 4.1, 5.5, 6.2, 6.3, 7.1, 7.2, 7.3, 7.4, 7.5, 8.4, 9.1, 9.2, 9.4_

  - [ ]* 5.1 Write property test for card rendering completeness (Property 8)
    - **Property 8: Card Renders All Required Fields** — for any `SharedGroup`, the rendered `SharedPaymentCardComponent` displays: group name, Group Leader name, Group Member name (or `"Awaiting Member"` when `group_member` is null), `slot_payment_status`, each member's `individual_contribution` in PKR, and each member's `trust_score`
    - Use `fc.record({ group: sharedGroupArb })` covering both `group_member: null` and `group_member` present cases
    - Tag: `// Feature: shared-participation, Property 8: Card renders all required fields`
    - **Validates: Requirements 7.1, 7.2, 7.5, 8.4**

  - [ ]* 5.2 Write property test for management action visibility (Property 12)
    - **Property 12: Management Actions Restricted to Group Leader** — for any `SharedGroup` and any `currentUserId` that does not equal `group_leader.user_id`, the rendered card does NOT show invite or cancel-invite controls
    - Use `fc.record({ group: sharedGroupArb, nonLeaderUserId: fc.uuid() })` where `nonLeaderUserId !== group.group_leader.user_id`
    - Tag: `// Feature: shared-participation, Property 12: Management actions restricted to group leader`
    - **Validates: Requirements 9.4**

- [x] 6. Implement `InviteMemberModalComponent`
  - Create `src/app/pages/shared-group/invite-member-modal.ts` as a standalone component with selector `app-invite-member-modal`
  - Declare `@Input() group!: SharedGroup`
  - Declare `@Output() submitted = new EventEmitter<{ groupId: string; inviteeEmail: string }>()` and `@Output() closed = new EventEmitter<void>()`
  - Implement a reactive form (`ReactiveFormsModule`) with a single `email` field using `Validators.required` and `Validators.email`
  - On valid submit, emit `submitted` with `{ groupId: group.id, inviteeEmail: emailControl.value }`; on cancel/backdrop click, emit `closed`
  - Create `src/app/pages/shared-group/invite-member-modal.html` — modal overlay matching the style of the upload modal in `payments.html` (backdrop blur, white card, header with icon, body with email input and error state, submit/cancel buttons)
  - Create `src/app/pages/shared-group/invite-member-modal.scss` (empty or minimal)
  - Wire the modal into `SharedGroupComponent`: open when `activeModal()` equals the group id, close on `closed` event, call `SharedGroupService.inviteMember()` on `submitted` event and refresh the groups signal
  - _Requirements: 2.2, 2.3, 2.6_

  - [ ]* 6.1 Write unit tests for `InviteMemberModalComponent`
    - Test that submitting with an invalid email does not emit `submitted`
    - Test that submitting with a valid email emits `submitted` with the correct `groupId` and `inviteeEmail`
    - Test that clicking cancel emits `closed`
    - _Requirements: 2.2, 2.3_

- [x] 7. Add "Join as Shared Group" toggle to the browse-committees join flow
  - In `src/app/pages/browse-committees/browse-committees.ts`, add a `joinAsSharedGroup = signal<Record<string, boolean>>({})` signal to track the per-card toggle state
  - Add a `toggleSharedGroup(committeeId: string)` method that flips the toggle for that committee
  - Update `joinCommittee(c, event)` to check the toggle: if enabled, call `SharedGroupService.createSharedGroup(c.id)` instead of (or in addition to) `CommitteeService.joinCommittee(c.id)`, then navigate to `/shared-groups`
  - In `src/app/pages/browse-committees/browse-committees.html`, add a "Join as Shared Group" toggle control inside each committee card's action area, above the existing join button — use a styled checkbox/toggle consistent with the existing card design; show it only when the user is not the owner and has not already requested
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 8. Checkpoint — end-to-end wiring verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- All service methods use mock in-memory data; Supabase integration is intentionally deferred
- Property tests use [fast-check](https://github.com/dubzzz/fast-check) with a minimum of 100 iterations per property
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation before moving to the next phase
