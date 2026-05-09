# Requirements Document

## Introduction

The **Shared Participation** feature allows two users to jointly occupy a single committee slot in the TrustCom Committee Management app. One user acts as the Group Leader and invites a second member. Both members contribute half the monthly committee amount independently, and the slot is only marked "Paid" once both contributions are confirmed. When the shared group wins the committee payout, the winnings are split equally between both members. The feature includes a dedicated UI card, separate payment proof uploads per member, and individual trust score tracking.

---

## Glossary

- **Shared_Group**: A pair of exactly two users who jointly occupy one committee slot.
- **Group_Leader**: The user who initiates the shared group, sends the invite, and manages group participation.
- **Group_Member**: The second user who accepts the Group Leader's invitation to join the shared group.
- **Shared_Slot**: The single committee slot occupied by a Shared_Group.
- **Individual_Contribution**: Each member's portion of the monthly committee amount (equal split: total ÷ 2).
- **Slot_Payment_Status**: The combined payment status of a Shared_Slot — becomes "Paid" only when both members' contributions are confirmed.
- **Payment_Proof**: A file (image or PDF) uploaded by a member as evidence of their Individual_Contribution.
- **Trust_Score**: A per-user numeric score reflecting payment reliability, maintained independently for each member.
- **Invite_Modal**: The UI dialog through which the Group_Leader sends an invitation to a prospective Group_Member.
- **Shared_Group_Card**: The UI card component displaying group name, leader, both member names, individual contribution amounts, and combined payment status.
- **Shared_Payment_Card**: The UI card component showing each member's individual payment status and proof upload controls.
- **Shared_Group_Service**: The Angular service managing all shared group data, state, and mock/backend operations.
- **Committee**: An existing committee entity in the system with a defined monthly amount and member slots.
- **System**: The TrustCom Angular application.

---

## Requirements

### Requirement 1: Join or Create a Committee as a Shared Group

**User Story:** As a user, I want to opt into a shared group when joining or creating a committee, so that I can share a single committee slot with one other person.

#### Acceptance Criteria

1. WHEN a user opens the join or create committee flow, THE System SHALL display a "Join as Shared Group" toggle option.
2. WHEN a user enables the "Join as Shared Group" option, THE System SHALL designate that user as the Group_Leader of a new Shared_Group.
3. WHEN a user enables the "Join as Shared Group" option, THE System SHALL reserve one Shared_Slot in the committee for the Shared_Group.
4. IF a committee slot is already occupied by a Shared_Group, THEN THE System SHALL prevent a second Shared_Group from occupying the same slot.
5. THE System SHALL enforce a maximum of 2 users per Shared_Group.

---

### Requirement 2: Group Leader Invitation System

**User Story:** As a Group Leader, I want to invite a second member to my shared group, so that we can jointly participate in the committee.

#### Acceptance Criteria

1. WHEN a Group_Leader has created a Shared_Group, THE System SHALL display an "Invite Member" action in the Shared_Group_Card.
2. WHEN the Group_Leader activates the "Invite Member" action, THE System SHALL open the Invite_Modal.
3. WHEN the Group_Leader submits an invitation via the Invite_Modal, THE System SHALL record the invitation and set the Shared_Group status to "Pending Member".
4. WHEN an invited user accepts the invitation, THE System SHALL assign that user as the Group_Member of the Shared_Group and set the Shared_Group status to "Active".
5. IF the invited user declines the invitation, THEN THE System SHALL set the Shared_Group status back to "Pending Member" and allow the Group_Leader to send a new invitation.
6. WHILE a Shared_Group status is "Pending Member", THE System SHALL display a pending invitation indicator in the Shared_Group_Card.

---

### Requirement 3: Shared Contribution Calculation

**User Story:** As a committee participant, I want the system to automatically calculate each member's share of the monthly amount, so that both members know exactly how much to pay.

#### Acceptance Criteria

1. WHEN a Shared_Group is created for a committee, THE System SHALL calculate each member's Individual_Contribution as the committee's monthly_amount divided by 2.
2. THE Shared_Group_Card SHALL display each member's Individual_Contribution amount in PKR.
3. WHEN both members' Individual_Contributions are confirmed for a payment cycle, THE System SHALL set the Slot_Payment_Status to "Paid".
4. WHILE only one member has confirmed their Individual_Contribution, THE System SHALL set the Slot_Payment_Status to "Partially Paid".
5. WHILE neither member has confirmed their Individual_Contribution, THE System SHALL set the Slot_Payment_Status to "Unpaid".

---

### Requirement 4: Separate Payment Proof Upload

**User Story:** As a shared group member, I want to upload my own payment proof independently, so that my contribution is tracked separately from my partner's.

#### Acceptance Criteria

1. THE Shared_Payment_Card SHALL display a separate payment proof upload control for each member of the Shared_Group.
2. WHEN a member uploads a Payment_Proof, THE System SHALL associate that Payment_Proof with the uploading member's user ID and the current payment cycle.
3. WHEN a member uploads a Payment_Proof, THE System SHALL set that member's individual payment status to "Submitted".
4. IF a member uploads a file that is not JPG, PNG, or PDF format, THEN THE System SHALL reject the upload and display a descriptive error message.
5. IF a member uploads a file larger than 5MB, THEN THE System SHALL reject the upload and display a descriptive error message.
6. WHEN an admin reviews and accepts a member's Payment_Proof, THE System SHALL set that member's individual payment status to "Accepted".
7. WHEN an admin reviews and rejects a member's Payment_Proof, THE System SHALL set that member's individual payment status to "Rejected".

---

### Requirement 5: Slot Payment Status Aggregation

**User Story:** As a committee admin, I want to see the combined payment status of a shared slot, so that I can confirm when the full slot amount has been paid.

#### Acceptance Criteria

1. THE System SHALL compute the Slot_Payment_Status by combining both members' individual payment statuses.
2. WHEN both members' individual payment statuses are "Accepted", THE System SHALL set the Slot_Payment_Status to "Paid".
3. WHEN exactly one member's individual payment status is "Accepted", THE System SHALL set the Slot_Payment_Status to "Partially Paid".
4. WHEN neither member's individual payment status is "Accepted", THE System SHALL set the Slot_Payment_Status to "Unpaid".
5. THE Shared_Group_Card SHALL display the current Slot_Payment_Status prominently.

---

### Requirement 6: Shared Winner Distribution

**User Story:** As a shared group member, I want the committee winnings to be split equally between me and my partner when our group wins, so that each of us receives our fair share.

#### Acceptance Criteria

1. WHEN a Shared_Group wins the committee payout, THE System SHALL calculate each member's share as the total payout divided by 2.
2. WHEN a Shared_Group wins the committee payout, THE System SHALL display each member's individual payout amount in the Shared_Group_Card.
3. THE Shared_Group_Card SHALL visually distinguish the winner distribution section from the contribution section.
4. WHEN a Shared_Group wins the committee payout, THE System SHALL display a winner notification to both the Group_Leader and the Group_Member.

---

### Requirement 7: Shared Group Card UI

**User Story:** As a user, I want a clear and modern card UI for my shared group, so that I can quickly see the group's status, members, and payment information at a glance.

#### Acceptance Criteria

1. THE Shared_Group_Card SHALL display the group name, Group_Leader name, Group_Member name (or "Awaiting Member" if not yet joined), and the Slot_Payment_Status.
2. THE Shared_Group_Card SHALL display each member's Individual_Contribution amount separately.
3. THE Shared_Group_Card SHALL use a card-based layout with rounded corners and soft shadows consistent with the existing SaaS dashboard design.
4. THE Shared_Group_Card SHALL be responsive and render correctly on both desktop and mobile viewport widths.
5. WHEN the Shared_Group has no Group_Member yet, THE Shared_Group_Card SHALL display a visual placeholder indicating the open member slot.

---

### Requirement 8: Individual Trust Score Maintenance

**User Story:** As a committee admin, I want each shared group member's trust score to be tracked independently, so that individual payment reliability is accurately reflected.

#### Acceptance Criteria

1. THE System SHALL maintain a separate Trust_Score for the Group_Leader and the Group_Member.
2. WHEN a member's Payment_Proof is accepted for a payment cycle, THE System SHALL update only that member's Trust_Score.
3. WHEN a member misses a payment cycle deadline, THE System SHALL update only that member's Trust_Score.
4. THE Shared_Group_Card SHALL display each member's Trust_Score individually.

---

### Requirement 9: Group Leader Management Capabilities

**User Story:** As a Group Leader, I want to manage my shared group's participation, so that I can keep the group's information and status up to date.

#### Acceptance Criteria

1. THE System SHALL allow the Group_Leader to view the combined contribution status of the Shared_Group.
2. THE System SHALL allow the Group_Leader to view both members' individual payment statuses.
3. WHEN the Group_Member has not yet joined, THE System SHALL allow the Group_Leader to cancel the pending invitation and send a new one.
4. THE System SHALL restrict Group_Leader management actions (invite, cancel invite) to the Group_Leader only; the Group_Member SHALL NOT have access to these actions.

---

### Requirement 10: Mock Data and Modular Architecture

**User Story:** As a developer, I want the shared participation feature to use mock/static data initially and be structured in a modular, scalable way, so that backend integration can be added later without major refactoring.

#### Acceptance Criteria

1. THE Shared_Group_Service SHALL provide mock data for Shared_Groups, member statuses, and payment statuses during initial development.
2. THE Shared_Group_Service SHALL expose clearly defined interfaces (TypeScript interfaces) for SharedGroup, SharedGroupMember, and SharedPaymentStatus.
3. THE System SHALL implement the shared participation feature using the following standalone Angular components: `SharedGroupComponent`, `SharedPaymentCardComponent`, and `InviteMemberModalComponent`.
4. WHEN the Shared_Group_Service methods are called, THE System SHALL return data conforming to the defined TypeScript interfaces.
5. THE Shared_Group_Service SHALL include inline code comments explaining each method's purpose and the data it returns.
