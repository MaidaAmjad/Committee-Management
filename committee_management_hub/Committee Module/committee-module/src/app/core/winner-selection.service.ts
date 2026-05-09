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
  selected_by: string; // user_id of admin who selected (for manual) or 'system' for random
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
   * Get eligible members for winner selection
   * Excludes members who have already won
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

    // Get members who have already won
    const { data: winners, error: winnersError } = await this.supabase
      .from('winner_selections')
      .select('member_id')
      .eq('committee_id', committeeId);

    if (winnersError) {
      console.warn('Failed to fetch winners:', winnersError.message);
      return { data: members as EligibleMember[], error: null };
    }

    // Filter out members who have already won
    const winnerIds = new Set((winners || []).map((w: any) => w.member_id));
    const eligible = members.filter(m => !winnerIds.has(m.id)) as EligibleMember[];

    return { data: eligible, error: null };
  }

  /**
   * Select a random winner from eligible members
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

    // Insert winner selection
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

  /**
   * Manually select a winner
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

    // Insert winner selection
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
}
