import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

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
  private supabase;

  constructor(
    private auth: AuthService,
    private supabaseService: SupabaseService
  ) {
    this.supabase = this.supabaseService.client;
  }

  // ── In-memory store (starts empty — populated by createSharedGroup) ─────────
  private mockGroups: SharedGroup[] = [];

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
   * Loads from database for persistence across page refreshes.
   */
  async getMySharedGroups(): Promise<{ data: SharedGroup[]; error: string | null }> {
    const user = this.auth.user();
    if (!user) return { data: [], error: 'Not authenticated' };

    console.log('🔍 Fetching shared groups for user:', user.id);

    // Get user's committee_member IDs (including pending members)
    const { data: myMemberRecords, error: memberError } = await this.supabase
      .from('committee_members')
      .select('id, committee_id')
      .eq('user_id', user.id)
      .eq('slot_type', 'shared')
      .in('status', ['pending', 'approved']); // Include both pending and approved

    if (memberError) {
      console.error('❌ Failed to fetch member records:', memberError);
      return { data: [], error: memberError.message };
    }

    if (!myMemberRecords || myMemberRecords.length === 0) {
      console.log('ℹ️ No shared member records found');
      return { data: [], error: null };
    }

    const myMemberIds = myMemberRecords.map(m => m.id);
    console.log('👤 My member IDs:', myMemberIds);

    // Get shared groups where user is leader or member
    // Using separate queries and combining results for better compatibility
    const leaderQuery = this.supabase
      .from('shared_groups')
      .select('*')
      .in('group_leader_member_id', myMemberIds);

    const memberQuery = this.supabase
      .from('shared_groups')
      .select('*')
      .in('group_member_member_id', myMemberIds);

    const [leaderResult, memberResult] = await Promise.all([leaderQuery, memberQuery]);

    if (leaderResult.error) {
      console.error('❌ Failed to fetch shared groups (leader):', leaderResult.error);
      return { data: [], error: leaderResult.error.message };
    }

    if (memberResult.error) {
      console.error('❌ Failed to fetch shared groups (member):', memberResult.error);
      return { data: [], error: memberResult.error.message };
    }

    // Combine results and remove duplicates
    const allGroups = [...(leaderResult.data || []), ...(memberResult.data || [])];
    const uniqueGroups = Array.from(new Map(allGroups.map(g => [g.id, g])).values());
    const dbGroups = uniqueGroups;

    console.log('📊 Database query result:', dbGroups);

    if (!dbGroups || dbGroups.length === 0) {
      console.log('ℹ️ No shared groups found in database');
      return { data: [], error: null };
    }

    console.log('✅ Found', dbGroups.length, 'shared groups in database');
    console.log('📋 Raw database groups:', JSON.stringify(dbGroups, null, 2));

    // Convert database records to SharedGroup format
    const enrichedGroups: SharedGroup[] = [];

    for (const dbGroup of dbGroups) {
      console.log('🔄 Processing group:', dbGroup.id);
      
      // Get committee info
      const { data: committee, error: committeeError } = await this.supabase
        .from('committees')
        .select('name, monthly_amount')
        .eq('id', dbGroup.committee_id)
        .single();

      if (committeeError) {
        console.error('❌ Error fetching committee:', committeeError);
      }

      if (!committee) {
        console.warn('⚠️ Committee not found for group:', dbGroup.id, 'committee_id:', dbGroup.committee_id);
        continue;
      }

      console.log('✅ Committee found:', committee.name);

      // Get leader info
      const { data: leaderMember, error: leaderError } = await this.supabase
        .from('committee_members')
        .select('user_id, full_name, email')
        .eq('id', dbGroup.group_leader_member_id)
        .single();

      if (leaderError) {
        console.error('❌ Error fetching leader:', leaderError);
      }

      if (!leaderMember) {
        console.warn('⚠️ Leader not found for group:', dbGroup.id, 'leader_id:', dbGroup.group_leader_member_id);
        continue;
      }

      console.log('✅ Leader found:', leaderMember.full_name);

      // Get member info (if exists)
      let memberInfo = null;
      if (dbGroup.group_member_member_id) {
        console.log('🔍 Fetching second member:', dbGroup.group_member_member_id);
        
        const { data: memberMember, error: memberError } = await this.supabase
          .from('committee_members')
          .select('user_id, full_name, email')
          .eq('id', dbGroup.group_member_member_id)
          .single();

        if (memberError) {
          console.error('❌ Error fetching member:', memberError);
        }

        if (memberMember) {
          console.log('✅ Member found:', memberMember.full_name);
          memberInfo = {
            user_id: memberMember.user_id,
            full_name: memberMember.full_name,
            email: memberMember.email,
            trust_score: 0,
            payment_status: 'Unpaid' as IndividualPaymentStatus
          };
        } else {
          console.warn('⚠️ Member not found for ID:', dbGroup.group_member_member_id);
        }
      } else {
        console.log('ℹ️ No second member yet (pending)');
      }

      const group: SharedGroup = {
        id: dbGroup.id,
        committee_id: dbGroup.committee_id,
        committee_name: committee.name,
        monthly_amount: committee.monthly_amount,
        individual_contribution: this.computeIndividualContribution(committee.monthly_amount),
        status: dbGroup.status === 'active' ? 'Active' : dbGroup.status === 'pending' ? 'Pending Member' : 'Completed',
        slot_payment_status: 'Unpaid',
        group_leader: {
          user_id: leaderMember.user_id,
          full_name: leaderMember.full_name,
          email: leaderMember.email,
          trust_score: 0,
          payment_status: 'Unpaid'
        },
        group_member: memberInfo,
        pending_invitee_email: null,
        created_at: dbGroup.created_at
      };

      // Compute slot payment status
      group.slot_payment_status = this.computeSlotPaymentStatus(group);

      console.log('✅ Enriched group created:', {
        id: group.id,
        committee: group.committee_name,
        leader: group.group_leader.full_name,
        member: group.group_member?.full_name || 'None',
        status: group.status
      });

      enrichedGroups.push(group);
    }

    // Update mockGroups for backward compatibility
    this.mockGroups = enrichedGroups;

    console.log('✅ Returning', enrichedGroups.length, 'enriched groups');
    console.log('📦 Final enriched groups:', JSON.stringify(enrichedGroups.map(g => ({
      id: g.id,
      committee: g.committee_name,
      leader: g.group_leader.full_name,
      member: g.group_member?.full_name,
      status: g.status
    })), null, 2));
    
    return { data: enrichedGroups, error: null };
  }

  // ── Mutation methods ──────────────────────────────────────────────────────

  /**
   * Find a pending shared group for a committee (waiting for second member)
   * Returns null if no pending group exists
   */
  async findPendingSharedGroup(committeeId: string): Promise<{ data: SharedGroup | null; error: string | null }> {
    console.log('🔍 Looking for pending shared group in committee:', committeeId);

    // First, log all shared groups for this committee (for debugging)
    const { data: allGroups, error: allError } = await this.supabase
      .from('shared_groups')
      .select('id, status, group_leader_member_id, group_member_member_id')
      .eq('committee_id', committeeId);

    console.log('📋 All shared groups for committee:', allGroups, 'error:', allError);

    const { data: pendingGroups, error } = await this.supabase
      .from('shared_groups')
      .select('*')
      .eq('committee_id', committeeId)
      .eq('status', 'pending')
      .is('group_member_member_id', null)
      .limit(1);

    console.log('🔎 Pending groups query result:', pendingGroups, 'error:', error);

    if (error) {
      console.error('❌ Failed to find pending shared group:', error);
      return { data: null, error: error.message };
    }

    if (!pendingGroups || pendingGroups.length === 0) {
      console.log('ℹ️ No pending shared group found');
      return { data: null, error: null };
    }

    const dbGroup = pendingGroups[0];
    console.log('✅ Found pending shared group:', dbGroup.id);

    // Get committee info
    const { data: committee } = await this.supabase
      .from('committees')
      .select('name, monthly_amount')
      .eq('id', dbGroup.committee_id)
      .single();

    if (!committee) {
      return { data: null, error: 'Committee not found' };
    }

    // Get leader info
    const { data: leaderMember } = await this.supabase
      .from('committee_members')
      .select('user_id, full_name, email')
      .eq('id', dbGroup.group_leader_member_id)
      .single();

    if (!leaderMember) {
      return { data: null, error: 'Leader not found' };
    }

    const group: SharedGroup = {
      id: dbGroup.id,
      committee_id: dbGroup.committee_id,
      committee_name: committee.name,
      monthly_amount: committee.monthly_amount,
      individual_contribution: this.computeIndividualContribution(committee.monthly_amount),
      status: 'Pending Member',
      slot_payment_status: 'Unpaid',
      group_leader: {
        user_id: leaderMember.user_id,
        full_name: leaderMember.full_name,
        email: leaderMember.email,
        trust_score: 0,
        payment_status: 'Unpaid'
      },
      group_member: null,
      pending_invitee_email: null,
      created_at: dbGroup.created_at
    };

    return { data: group, error: null };
  }

  /**
   * Join an existing pending shared group as the second member
   */
  async joinExistingSharedGroup(
    groupId: string,
    committeeId: string
  ): Promise<{ error: string | null }> {
    const user = this.auth.user();
    if (!user) return { error: 'Not authenticated' };

    console.log('👥 Joining existing shared group:', groupId);

    // Get the current user's committee_member record
    const { data: memberRecord, error: memberError } = await this.supabase
      .from('committee_members')
      .select('id')
      .eq('committee_id', committeeId)
      .eq('user_id', user.id)
      .eq('slot_type', 'shared')
      .single();

    if (memberError || !memberRecord) {
      console.error('Failed to find member record:', memberError);
      return { error: 'Could not find your member record. Please try again.' };
    }

    console.log('✅ Found member record:', memberRecord.id);

    // Update shared group with second member
    const { data: updateData, error: updateError, count } = await this.supabase
      .from('shared_groups')
      .update({
        group_member_member_id: memberRecord.id,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', groupId)
      .select();

    if (updateError) {
      console.error('❌ Failed to join shared group (DB error):', updateError);
      return { error: updateError.message };
    }

    // Check if the update actually affected any rows
    // If RLS blocked it, Supabase returns empty array with no error
    if (!updateData || updateData.length === 0) {
      console.error('❌ Update was blocked (likely RLS policy). No rows updated.');
      console.log('💡 Please run fix-shared-groups-rls.sql in Supabase SQL Editor');
      return { error: 'Permission denied: Could not join shared group. Please ask admin to run the RLS fix migration.' };
    }

    console.log('✅ Successfully joined shared group as second member:', updateData);
    return { error: null };
  }

  /**
   * Creates a new shared group for a committee slot, designating the current
   * user as the Group Leader. Saves to database for persistence.
   */
  async createSharedGroup(
    committeeId: string,
    committeeName: string,
    monthlyAmount: number
  ): Promise<{ data: SharedGroup | null; error: string | null }> {
    const user = this.auth.user();
    if (!user) return { data: null, error: 'Not authenticated' };

    // Check if current user is already in a shared group for this committee
    const userExistingGroup = this.mockGroups.find(g => 
      g.committee_id === committeeId && 
      (g.group_leader.user_id === user.id || g.group_member?.user_id === user.id)
    );
    
    if (userExistingGroup) {
      return { data: null, error: 'You are already part of a shared group for this committee' };
    }

    // Get the current user's committee_member record (any status - pending or approved)
    const { data: memberRecord, error: memberError } = await this.supabase
      .from('committee_members')
      .select('id')
      .eq('committee_id', committeeId)
      .eq('user_id', user.id)
      .eq('slot_type', 'shared')
      .single();

    if (memberError || !memberRecord) {
      console.error('Failed to find member record:', memberError);
      return { data: null, error: 'Could not find your member record. Please try again.' };
    }

    // Create shared group in database
    const { data: dbGroup, error: dbError } = await this.supabase
      .from('shared_groups')
      .insert({
        committee_id: committeeId,
        group_leader_member_id: memberRecord.id,
        status: 'pending'
      })
      .select()
      .single();

    if (dbError) {
      console.error('Failed to create shared group in database:', dbError);
      return { data: null, error: dbError.message };
    }

    console.log('✅ Shared group created in database:', dbGroup);

    const newGroup: SharedGroup = {
      id: dbGroup.id,
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
        trust_score: 0,
        payment_status: 'Unpaid',
      },
      group_member: null,
      pending_invitee_email: null,
      created_at: dbGroup.created_at,
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

    // Update in-memory
    group.pending_invitee_email = inviteeEmail;
    group.status = 'Pending Member';

    // Note: Invitation tracking can be added to database in future
    // For now, invitations are handled through the join flow
    console.log('📧 Invitation recorded for:', inviteeEmail);
    
    return { error: null };
  }

  /**
   * Assigns the given user as the Group Member, activating the shared group.
   * Called when the invitee accepts the invitation (second member joins).
   */
  async acceptInvitation(
    groupId: string,
    userId: string,
    fullName: string,
    email: string
  ): Promise<{ error: string | null }> {
    const group = this.mockGroups.find(g => g.id === groupId);
    if (!group) return { error: 'Group not found' };

    // Get the second member's committee_member record
    const { data: memberRecord, error: memberError } = await this.supabase
      .from('committee_members')
      .select('id')
      .eq('committee_id', group.committee_id)
      .eq('user_id', userId)
      .eq('slot_type', 'shared')
      .single();

    if (memberError || !memberRecord) {
      console.error('Failed to find second member record:', memberError);
      return { error: 'Could not find your member record' };
    }

    // Update shared group in database
    const { error: updateError } = await this.supabase
      .from('shared_groups')
      .update({
        group_member_member_id: memberRecord.id,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', groupId);

    if (updateError) {
      console.error('Failed to update shared group in database:', updateError);
      return { error: updateError.message };
    }

    console.log('✅ Second member joined shared group in database');

    // Update in-memory
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
