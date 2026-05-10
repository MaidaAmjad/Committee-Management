import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

/**
 * Distribution method types for committee winner selection
 */
export type DistributionMethod = 'random' | 'manual';

/**
 * Winner selection record interface
 */
export interface WinnerSelection {
  id: string;
  committee_id: string;
  member_id: string;
  member_name: string;
  member_email: string;
  cycle_number: number;
  selected_at: string;
  selection_method: DistributionMethod;
  selected_by: string;
  is_shared_group?: boolean;
  shared_group_id?: string;
  shared_group_member_ids?: string[];
  payment_details_user_id?: string;
}

/**
 * Payment details for winner
 */
export interface WinnerPaymentDetails {
  methods: Array<{
    method_type: 'jazzcash' | 'easypaisa' | 'bank';
    account_number: string;
    account_title: string;
    bank_name?: string;
    iban?: string;
    is_primary: boolean;
  }>;
}

/**
 * Eligible member for selection
 */
export interface EligibleMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  slot_type: 'full' | 'shared';
  shared_group_id?: string; // If part of shared group
}

/**
 * Shared group info for winner selection
 */
export interface SharedGroupInfo {
  id: string;
  group_leader_user_id: string;
  group_leader_name: string;
  group_member_user_id: string;
  group_member_name: string;
}

/**
 * Service for managing committee winner selection and distribution methods
 */
@Injectable({ providedIn: 'root' })
export class WinnerSelectionService {
  private supabase;

  constructor(
    private supabaseService: SupabaseService,
    private auth: AuthService
  ) {
    this.supabase = this.supabaseService.client;
  }

  /**
   * Get eligible members for winner selection.
   * Excludes:
   * - Individual members who have already won
   * - BOTH members of a shared group if that group has already won
   */
  async getEligibleMembers(committeeId: string): Promise<{ data: EligibleMember[]; error: string | null }> {
    // Get all approved members
    const { data: members, error: membersError } = await this.supabase
      .from('committee_members')
      .select('id, user_id, full_name, email, slot_type')
      .eq('committee_id', committeeId)
      .eq('status', 'approved');

    if (membersError) return { data: [], error: membersError.message };
    if (!members || members.length === 0) return { data: [], error: null };

    // Get all past winner selections for this committee
    const { data: winners, error: winnersError } = await this.supabase
      .from('winner_selections')
      .select('member_id, is_shared_group, shared_group_id')
      .eq('committee_id', committeeId);

    if (winnersError) {
      console.warn('Failed to fetch winners:', winnersError.message);
      return { data: members as EligibleMember[], error: null };
    }

    // Build set of excluded member IDs
    const excludedMemberIds = new Set<string>();

    // Add directly selected member IDs
    (winners || []).forEach((w: any) => excludedMemberIds.add(w.member_id));

    // For shared group wins, also exclude the OTHER member of the group
    const wonSharedGroupIds = (winners || [])
      .filter((w: any) => w.is_shared_group && w.shared_group_id)
      .map((w: any) => w.shared_group_id as string);

    if (wonSharedGroupIds.length > 0) {
      // Fetch both members of each won shared group
      const { data: sharedGroups } = await this.supabase
        .from('shared_groups')
        .select('group_leader_member_id, group_member_member_id')
        .in('id', wonSharedGroupIds);

      (sharedGroups || []).forEach((sg: any) => {
        if (sg.group_leader_member_id) excludedMemberIds.add(sg.group_leader_member_id);
        if (sg.group_member_member_id) excludedMemberIds.add(sg.group_member_member_id);
      });
    }

    console.log('🚫 Excluded member IDs (already won):', [...excludedMemberIds]);

    const eligible = members.filter(m => !excludedMemberIds.has(m.id)) as EligibleMember[];
    console.log('✅ Eligible members:', eligible.map(m => m.full_name));

    return { data: eligible, error: null };
  }

  /**
   * Get shared group information for a member
   * Returns null if member is not part of an active shared group
   */
  async getSharedGroupForMember(
    committeeId: string,
    memberId: string
  ): Promise<{ data: SharedGroupInfo | null; error: string | null }> {
    const { data, error } = await this.supabase
      .rpc('get_shared_group_for_member', {
        p_committee_id: committeeId,
        p_member_id: memberId
      });

    if (error) {
      console.error('Failed to get shared group:', error);
      return { data: null, error: error.message };
    }

    if (!data || data.length === 0) {
      return { data: null, error: null };
    }

    const group = data[0];

    // Get member details for both leader and member
    const { data: leaderData } = await this.supabase
      .from('committee_members')
      .select('user_id, full_name')
      .eq('id', group.group_leader_member_id)
      .single();

    const { data: memberData } = await this.supabase
      .from('committee_members')
      .select('user_id, full_name')
      .eq('id', group.group_member_member_id)
      .single();

    if (!leaderData || !memberData) {
      return { data: null, error: 'Could not fetch member details' };
    }

    return {
      data: {
        id: group.id,
        group_leader_user_id: leaderData.user_id,
        group_leader_name: leaderData.full_name,
        group_member_user_id: memberData.user_id,
        group_member_name: memberData.full_name
      },
      error: null
    };
  }

  /**
   * Select a random winner from eligible members
   * If selected member is part of a shared group, both members are selected as winners
   */
  async selectRandomWinner(committeeId: string): Promise<{ data: WinnerSelection | null; error: string | null }> {
    const user = this.auth.user();
    if (!user) return { data: null, error: 'Not authenticated' };

    // Get eligible members
    const { data: eligible, error: eligibleError } = await this.getEligibleMembers(committeeId);
    if (eligibleError) return { data: null, error: eligibleError };
    if (!eligible || eligible.length === 0) {
      return { data: null, error: 'No eligible members available for selection' };
    }

    // Select random member
    const randomIndex = Math.floor(Math.random() * eligible.length);
    const selectedMember = eligible[randomIndex];

    // Get current cycle number
    const { data: existingWinners } = await this.supabase
      .from('winner_selections')
      .select('cycle_number')
      .eq('committee_id', committeeId)
      .order('cycle_number', { ascending: false })
      .limit(1);

    const cycleNumber = existingWinners && existingWinners.length > 0 
      ? existingWinners[0].cycle_number + 1 
      : 1;

    // Clear all previous payment proofs for this committee
    await this.clearPreviousPaymentProofs(committeeId);

    // Check if selected member is part of a shared group
    const { data: sharedGroup } = await this.getSharedGroupForMember(committeeId, selectedMember.id);

    if (sharedGroup) {
      // Both members of shared group are winners
      console.log('🎯 Selected member is part of shared group, selecting both members as winners');
      
      const { data: winner, error: insertError } = await this.supabase
        .from('winner_selections')
        .insert({
          committee_id: committeeId,
          member_id: selectedMember.id,
          member_name: `${sharedGroup.group_leader_name} & ${sharedGroup.group_member_name} (Shared Group)`,
          member_email: selectedMember.email,
          cycle_number: cycleNumber,
          selection_method: 'random',
          selected_by: 'system',
          is_shared_group: true,
          shared_group_id: sharedGroup.id,
          shared_group_member_ids: [selectedMember.id], // Will be updated to include both member IDs
          payment_details_user_id: sharedGroup.group_leader_user_id
        })
        .select()
        .single();

      if (insertError) return { data: null, error: insertError.message };

      return { data: winner as WinnerSelection, error: null };
    } else {
      // Single member winner
      const { data: winner, error: insertError } = await this.supabase
        .from('winner_selections')
        .insert({
          committee_id: committeeId,
          member_id: selectedMember.id,
          member_name: selectedMember.full_name,
          member_email: selectedMember.email,
          cycle_number: cycleNumber,
          selection_method: 'random',
          selected_by: 'system',
        })
        .select()
        .single();

      if (insertError) return { data: null, error: insertError.message };

      return { data: winner as WinnerSelection, error: null };
    }
  }

  /**
   * Manually select a winner
   * If selected member is part of a shared group, both members are selected as winners
   */
  async selectManualWinner(
    committeeId: string, 
    memberId: string
  ): Promise<{ data: WinnerSelection | null; error: string | null }> {
    const user = this.auth.user();
    if (!user) return { data: null, error: 'Not authenticated' };

    // Verify member is eligible
    const { data: eligible, error: eligibleError } = await this.getEligibleMembers(committeeId);
    if (eligibleError) return { data: null, error: eligibleError };
    
    const selectedMember = eligible.find(m => m.id === memberId);
    if (!selectedMember) {
      return { data: null, error: 'Selected member is not eligible or has already won' };
    }

    // Get current cycle number
    const { data: existingWinners } = await this.supabase
      .from('winner_selections')
      .select('cycle_number')
      .eq('committee_id', committeeId)
      .order('cycle_number', { ascending: false })
      .limit(1);

    const cycleNumber = existingWinners && existingWinners.length > 0 
      ? existingWinners[0].cycle_number + 1 
      : 1;

    // Clear all previous payment proofs for this committee
    await this.clearPreviousPaymentProofs(committeeId);

    // Check if selected member is part of a shared group
    const { data: sharedGroup } = await this.getSharedGroupForMember(committeeId, selectedMember.id);

    if (sharedGroup) {
      // Both members of shared group are winners
      console.log('🎯 Selected member is part of shared group, selecting both members as winners');
      
      const { data: winner, error: insertError } = await this.supabase
        .from('winner_selections')
        .insert({
          committee_id: committeeId,
          member_id: selectedMember.id,
          member_name: `${sharedGroup.group_leader_name} & ${sharedGroup.group_member_name} (Shared Group)`,
          member_email: selectedMember.email,
          cycle_number: cycleNumber,
          selection_method: 'manual',
          selected_by: user.id,
          is_shared_group: true,
          shared_group_id: sharedGroup.id,
          shared_group_member_ids: [selectedMember.id], // Will be updated to include both member IDs
          payment_details_user_id: sharedGroup.group_leader_user_id
        })
        .select()
        .single();

      if (insertError) return { data: null, error: insertError.message };

      return { data: winner as WinnerSelection, error: null };
    } else {
      // Single member winner
      const { data: winner, error: insertError } = await this.supabase
        .from('winner_selections')
        .insert({
          committee_id: committeeId,
          member_id: selectedMember.id,
          member_name: selectedMember.full_name,
          member_email: selectedMember.email,
          cycle_number: cycleNumber,
          selection_method: 'manual',
          selected_by: user.id,
        })
        .select()
        .single();

      if (insertError) return { data: null, error: insertError.message };

      return { data: winner as WinnerSelection, error: null };
    }
  }

  /**
   * Get current cycle winner for a committee
   */
  async getCurrentWinner(committeeId: string): Promise<{ data: WinnerSelection | null; error: string | null }> {
    const { data, error } = await this.supabase
      .from('winner_selections')
      .select('*')
      .eq('committee_id', committeeId)
      .order('cycle_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    return { data: data as WinnerSelection | null, error: null };
  }

  /**
   * Get all winners for a committee
   */
  async getAllWinners(committeeId: string): Promise<{ data: WinnerSelection[]; error: string | null }> {
    const { data, error } = await this.supabase
      .from('winner_selections')
      .select('*')
      .eq('committee_id', committeeId)
      .order('cycle_number', { ascending: false });

    if (error) return { data: [], error: error.message };
    return { data: data as WinnerSelection[], error: null };
  }

  /**
   * Get payment details for a winner
   */
  async getWinnerPaymentDetails(userId: string): Promise<{ data: WinnerPaymentDetails | null; error: string | null }> {
    const { data, error } = await this.supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', userId)
      .order('is_primary', { ascending: false });

    if (error) return { data: null, error: error.message };
    
    if (!data || data.length === 0) return { data: null, error: null };

    return {
      data: {
        methods: data.map(m => ({
          method_type: m.method_type,
          account_number: m.account_number,
          account_title: m.account_title,
          bank_name: m.bank_name,
          iban: m.iban,
          is_primary: m.is_primary
        }))
      },
      error: null
    };
  }

  /**
   * Send winner announcement to all committee members
   */
  async sendWinnerAnnouncement(
    committeeId: string,
    winnerName: string,
    cycleNumber: number,
    method: DistributionMethod
  ): Promise<{ error: string | null }> {
    const user = this.auth.user();
    if (!user) return { error: 'Not authenticated' };

    const methodText = method === 'random' ? 'randomly selected' : 'manually selected';
    const message = `🎉 Cycle ${cycleNumber} Winner Announcement!\n\n${winnerName} has been ${methodText} as the winner for this cycle. Payment details are now visible in the committee details page.`;

    const { error } = await this.supabase.from('committee_messages').insert({
      committee_id: committeeId,
      sender_id: user.id,
      sender_name: '🏆 Committee System',
      message,
    });

    if (error) return { error: error.message };
    return { error: null };
  }

  /**
   * Check if committee is complete (all members have won)
   * Returns true if no eligible members remain
   */
  async isCommitteeComplete(committeeId: string): Promise<boolean> {
    const { data: eligible } = await this.getEligibleMembers(committeeId);
    return !eligible || eligible.length === 0;
  }

  /**
   * Mark committee as completed and send notification to all members
   */
  async completeCommittee(committeeId: string, committeeName: string): Promise<{ error: string | null }> {
    const user = this.auth.user();
    if (!user) return { error: 'Not authenticated' };

    // Update committee status to Completed
    const { error: updateError } = await this.supabase
      .from('committees')
      .update({ status: 'Completed' })
      .eq('id', committeeId);

    if (updateError) {
      console.error('Failed to update committee status:', updateError);
      // Don't block — still send notification
    }

    // Send completion announcement to all members
    const message = `🎊 Committee Completed!\n\nThe "${committeeName}" committee has successfully completed all cycles. Every member has received their payout. Thank you all for participating!`;

    const { error: msgError } = await this.supabase.from('committee_messages').insert({
      committee_id: committeeId,
      sender_id: user.id,
      sender_name: '🎊 Committee System',
      message,
    });

    if (msgError) return { error: msgError.message };
    return { error: null };
  }

  /**
   * Clear all previous payment proofs for a committee
   * Called when a new winner is selected to start a fresh cycle
   */
  private async clearPreviousPaymentProofs(committeeId: string): Promise<void> {
    console.log('🗑️ Clearing previous payment proofs for committee:', committeeId);
    
    const { error } = await this.supabase
      .from('payment_proofs')
      .delete()
      .eq('committee_id', committeeId);

    if (error) {
      console.error('Failed to clear payment proofs:', error);
    } else {
      console.log('✅ Previous payment proofs cleared successfully');
    }
  }
}
