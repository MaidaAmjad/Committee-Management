import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';

// ── Domain types ─────────────────────────────────────────────────────────────

export type SharedGroupStatus =
  | 'Pending Member'   // group created, waiting for second member to accept
  | 'Active'           // both members present and participating
  | 'Completed';       // committee cycle has ended

export type IndividualPaymentStatus =
  | 'Unpaid'
  | 'Submitted'
  | 'Accepted'
  | 'Rejected';

export type SlotPaymentStatus =
  | 'Unpaid'
  | 'Partially Paid'
  | 'Paid';

// ── Core interfaces ───────────────────────────────────────────────────────────

/** A single member within a shared group (either leader or second member). */
export interface SharedGroupMember {
  user_id:        string;
  full_name:      string;
  email:          string;
  trust_score:    number;               // 0–100
  payment_status: IndividualPaymentStatus;
  proof?:         SharedPaymentProof;
}

/** A payment proof file uploaded by one member for a specific payment cycle. */
export interface SharedPaymentProof {
  id:           string;
  uploader_id:  string;
  file_name:    string;
  file_type:    'image' | 'pdf';
  file_url:     string;
  month_year:   string;                 // e.g. "2026-05"
  status:       IndividualPaymentStatus;
  created_at:   string;
}

/** The full shared group entity — two users sharing one committee slot. */
export interface SharedGroup {
  id:                      string;
  committee_id:            string;
  committee_name:          string;
  monthly_amount:          number;      // full slot amount (PKR)
  individual_contribution: number;      // monthly_amount / 2
  status:                  SharedGroupStatus;
  slot_payment_status:     SlotPaymentStatus;
  group_leader:            SharedGroupMember;
  group_member:            SharedGroupMember | null;  // null until accepted
  pending_invitee_email:   string | null;
  winner_payout?:          number;      // set when the group wins the committee
  created_at:              string;
}

/** View-model used by components — enriches SharedGroup with UI state. */
export interface SharedGroupCard {
  group:           SharedGroup;
  isLeader:        boolean;   // current user is the group_leader
  isMember:        boolean;   // current user is the group_member
  monthYear:       string;    // current payment cycle e.g. "2026-05"
  showUploadModal: boolean;
  uploading:       boolean;
  uploadError:     string;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class SharedGroupService {

  constructor(private auth: AuthService) {}

  // ── In-memory mock store ──────────────────────────────────────────────────
  // Seeded with two groups covering all status variants so the UI can be
  // developed and tested without a live backend.

  private mockGroups: SharedGroup[] = [
    {
      id: 'sg-001',
      committee_id: 'c-001',
      committee_name: 'Easy Month Committee',
      monthly_amount: 2000,
      individual_contribution: 1000,
      status: 'Active',
      slot_payment_status: 'Partially Paid',
      group_leader: {
        user_id: 'mock-leader-id',
        full_name: 'Maida Amjad',
        email: 'maidaamjad32@gmail.com',
        trust_score: 95,
        payment_status: 'Accepted',
        proof: {
          id: 'proof-001',
          uploader_id: 'mock-leader-id',
          file_name: 'payment_may.png',
          file_type: 'image',
          file_url: '',
          month_year: '2026-05',
          status: 'Accepted',
          created_at: new Date().toISOString(),
        },
      },
      group_member: {
        user_id: 'mock-member-id',
        full_name: 'Aliza Naeem',
        email: 'alizanaeem37@gmail.com',
        trust_score: 88,
        payment_status: 'Unpaid',
      },
      pending_invitee_email: null,
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'sg-002',
      committee_id: 'c-002',
      committee_name: 'Debt Committee',
      monthly_amount: 4000,
      individual_contribution: 2000,
      status: 'Pending Member',
      slot_payment_status: 'Unpaid',
      group_leader: {
        user_id: 'mock-leader-id',
        full_name: 'Maida Amjad',
        email: 'maidaamjad32@gmail.com',
        trust_score: 95,
        payment_status: 'Unpaid',
      },
      group_member: null,
      pending_invitee_email: 'amna@example.com',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  // ── Pure calculation functions ────────────────────────────────────────────

  /**
   * Calculates each member's share of the monthly committee amount.
   * Always returns exactly monthlyAmount / 2.
   */
  computeIndividualContribution(monthlyAmount: number): number {
    return monthlyAmount / 2;
  }

  /**
   * Calculates each member's share of the committee payout when the group wins.
   * Always returns exactly totalPayout / 2.
   */
  computeWinnerShare(totalPayout: number): number {
    return totalPayout / 2;
  }

  /**
   * Derives the combined slot payment status from both members' individual statuses.
   * - Both Accepted → "Paid"
   * - Exactly one Accepted → "Partially Paid"
   * - Neither Accepted → "Unpaid"
   * If group_member is null (no second member yet), always returns "Unpaid".
   */
  computeSlotPaymentStatus(group: SharedGroup): SlotPaymentStatus {
    if (!group.group_member) return 'Unpaid';
    const leaderPaid = group.group_leader.payment_status === 'Accepted';
    const memberPaid = group.group_member.payment_status === 'Accepted';
    if (leaderPaid && memberPaid) return 'Paid';
    if (leaderPaid || memberPaid) return 'Partially Paid';
    return 'Unpaid';
  }

  // ── Query methods ─────────────────────────────────────────────────────────

  /**
   * Returns all shared groups where the current user is either the leader or member.
   * Uses mock data; replace with Supabase query for backend integration.
   */
  async getMySharedGroups(): Promise<{ data: SharedGroup[]; error: string | null }> {
    const user = this.auth.user();
    if (!user) return { data: [], error: 'Not authenticated' };

    // In mock mode, return all groups where the current user matches leader or member.
    // For demo purposes we return all mock groups so the UI is always populated.
    const myGroups = this.mockGroups.filter(
      g =>
        g.group_leader.user_id === user.id ||
        g.group_member?.user_id === user.id ||
        // fallback: show all mock groups so the UI is visible during development
        g.group_leader.user_id === 'mock-leader-id'
    );

    return { data: [...myGroups], error: null };
  }

  // ── Mutation methods ──────────────────────────────────────────────────────

  /**
   * Creates a new shared group for a committee slot, designating the current
   * user as the Group Leader. Returns an error if the slot is already occupied.
   */
  async createSharedGroup(
    committeeId: string,
    committeeName: string,
    monthlyAmount: number
  ): Promise<{ data: SharedGroup | null; error: string | null }> {
    const user = this.auth.user();
    if (!user) return { data: null, error: 'Not authenticated' };

    // Enforce one shared group per committee slot
    const existing = this.mockGroups.find(g => g.committee_id === committeeId);
    if (existing) {
      return { data: null, error: 'Slot already occupied by a shared group' };
    }

    const newGroup: SharedGroup = {
      id: `sg-${Date.now()}`,
      committee_id: committeeId,
      committee_name: committeeName,
      monthly_amount: monthlyAmount,
      individual_contribution: this.computeIndividualContribution(monthlyAmount),
      status: 'Pending Member',
      slot_payment_status: 'Unpaid',
      group_leader: {
        user_id: user.id,
        full_name: user.user_metadata?.['full_name'] || user.email?.split('@')[0] || 'Leader',
        email: user.email ?? '',
        trust_score: 95,
        payment_status: 'Unpaid',
      },
      group_member: null,
      pending_invitee_email: null,
      created_at: new Date().toISOString(),
    };

    this.mockGroups.push(newGroup);
    return { data: newGroup, error: null };
  }

  /**
   * Records an invitation from the Group Leader to a prospective member.
   * Sets the group status to "Pending Member" and stores the invitee email.
   * Only the Group Leader may call this.
   */
  async inviteMember(
    groupId: string,
    inviteeEmail: string
  ): Promise<{ error: string | null }> {
    const user = this.auth.user();
    if (!user) return { error: 'Not authenticated' };

    const group = this.mockGroups.find(g => g.id === groupId);
    if (!group) return { error: 'Group not found' };
    if (group.group_leader.user_id !== user.id) {
      return { error: 'Only the Group Leader can invite members' };
    }

    group.pending_invitee_email = inviteeEmail;
    group.status = 'Pending Member';
    return { error: null };
  }

  /**
   * Assigns the given user as the Group Member, activating the shared group.
   * Called when the invitee accepts the invitation.
   */
  async acceptInvitation(
    groupId: string,
    userId: string,
    fullName: string,
    email: string
  ): Promise<{ error: string | null }> {
    const group = this.mockGroups.find(g => g.id === groupId);
    if (!group) return { error: 'Group not found' };

    group.group_member = {
      user_id: userId,
      full_name: fullName,
      email,
      trust_score: 90,
      payment_status: 'Unpaid',
    };
    group.status = 'Active';
    group.pending_invitee_email = null;
    return { error: null };
  }

  /**
   * Invitee declines the invitation. Resets the group to "Pending Member"
   * with no pending invitee, allowing the leader to send a new invite.
   */
  async declineInvitation(groupId: string): Promise<{ error: string | null }> {
    const group = this.mockGroups.find(g => g.id === groupId);
    if (!group) return { error: 'Group not found' };

    group.pending_invitee_email = null;
    group.status = 'Pending Member';
    return { error: null };
  }

  /**
   * Group Leader cancels a pending invitation. Same effect as decline —
   * resets to "Pending Member" so a new invite can be sent.
   */
  async cancelInvitation(groupId: string): Promise<{ error: string | null }> {
    const user = this.auth.user();
    if (!user) return { error: 'Not authenticated' };

    const group = this.mockGroups.find(g => g.id === groupId);
    if (!group) return { error: 'Group not found' };
    if (group.group_leader.user_id !== user.id) {
      return { error: 'Only the Group Leader can cancel invitations' };
    }

    group.pending_invitee_email = null;
    group.status = 'Pending Member';
    return { error: null };
  }

  /**
   * Validates and stores a payment proof for a specific member.
   * Accepted file types: image/jpeg, image/png, application/pdf (max 5MB).
   * Sets the member's payment_status to "Submitted" on success.
   */
  async uploadProof(
    groupId: string,
    memberId: string,
    file: File,
    monthYear: string
  ): Promise<{ error: string | null }> {
    // Validate file type
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      return { error: 'Only JPG, PNG, or PDF files are allowed.' };
    }
    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return { error: 'File must be under 5MB.' };
    }

    const group = this.mockGroups.find(g => g.id === groupId);
    if (!group) return { error: 'Group not found' };

    const proof: SharedPaymentProof = {
      id: `proof-${Date.now()}`,
      uploader_id: memberId,
      file_name: file.name,
      file_type: file.type.startsWith('image') ? 'image' : 'pdf',
      file_url: URL.createObjectURL(file),   // mock: use object URL
      month_year: monthYear,
      status: 'Submitted',
      created_at: new Date().toISOString(),
    };

    // Attach proof to the correct member
    if (group.group_leader.user_id === memberId) {
      group.group_leader.proof = proof;
      group.group_leader.payment_status = 'Submitted';
    } else if (group.group_member?.user_id === memberId) {
      group.group_member.proof = proof;
      group.group_member.payment_status = 'Submitted';
    } else {
      return { error: 'Member not found in this group' };
    }

    // Recompute slot status
    group.slot_payment_status = this.computeSlotPaymentStatus(group);
    return { error: null };
  }

  /**
   * Admin accepts a member's payment proof.
   * Updates only that member's payment_status to "Accepted" and increments
   * their trust_score. The other member's status is unchanged.
   */
  async acceptProof(
    groupId: string,
    proofId: string
  ): Promise<{ error: string | null }> {
    const group = this.mockGroups.find(g => g.id === groupId);
    if (!group) return { error: 'Group not found' };

    const member = this.findMemberByProofId(group, proofId);
    if (!member) return { error: 'Proof not found' };

    member.payment_status = 'Accepted';
    if (member.proof) member.proof.status = 'Accepted';
    member.trust_score = Math.min(100, member.trust_score + 2); // reward on-time payment

    group.slot_payment_status = this.computeSlotPaymentStatus(group);
    return { error: null };
  }

  /**
   * Admin rejects a member's payment proof.
   * Updates only that member's payment_status to "Rejected".
   * The other member's status is unchanged.
   */
  async rejectProof(
    groupId: string,
    proofId: string
  ): Promise<{ error: string | null }> {
    const group = this.mockGroups.find(g => g.id === groupId);
    if (!group) return { error: 'Group not found' };

    const member = this.findMemberByProofId(group, proofId);
    if (!member) return { error: 'Proof not found' };

    member.payment_status = 'Rejected';
    if (member.proof) member.proof.status = 'Rejected';

    group.slot_payment_status = this.computeSlotPaymentStatus(group);
    return { error: null };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /** Finds the member whose proof matches the given proofId. */
  private findMemberByProofId(
    group: SharedGroup,
    proofId: string
  ): SharedGroupMember | null {
    if (group.group_leader.proof?.id === proofId) return group.group_leader;
    if (group.group_member?.proof?.id === proofId) return group.group_member;
    return null;
  }

  /** Returns the current month-year string e.g. "2026-05". */
  getCurrentMonthYear(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}
