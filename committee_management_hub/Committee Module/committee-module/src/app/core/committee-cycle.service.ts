import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

/**
 * Payment proof status
 */
export type PaymentProofStatus = 'pending' | 'approved' | 'rejected';

/**
 * Cycle status
 */
export type CycleStatus = 'pending' | 'active' | 'completed' | 'cancelled';

/**
 * Payment proof interface
 */
export interface PaymentProof {
  id: string;
  committee_id: string;
  user_id: string;
  cycle_number: number;
  proof_image_url: string;
  amount: number;
  payment_date: string;
  submitted_at: string;
  status: PaymentProofStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
}

/**
 * Committee cycle interface
 */
export interface CommitteeCycle {
  id: string;
  committee_id: string;
  cycle_number: number;
  winner_member_id?: string;
  winner_user_id?: string;
  winner_name?: string;
  start_date: string;
  end_date: string;
  payment_deadline: string;
  status: CycleStatus;
  created_at: string;
  completed_at?: string;
}

/**
 * Current cycle info
 */
export interface CurrentCycleInfo {
  cycle_number: number;
  winner_name: string;
  winner_user_id: string;
  start_date: string;
  end_date: string;
  payment_deadline: string;
  days_remaining: number;
  status: string;
}

/**
 * Next winner info
 */
export interface NextWinner {
  member_id: string;
  member_name: string;
  member_email: string;
  user_id: string;
}

/**
 * Service for managing committee cycles and payment proofs
 */
@Injectable({ providedIn: 'root' })
export class CommitteeCycleService {
  private supabase;

  constructor(
    private supabaseService: SupabaseService,
    private auth: AuthService
  ) {
    this.supabase = this.supabaseService.client;
  }

  /**
   * Submit payment proof
   */
  async submitPaymentProof(
    committeeId: string,
    cycleNumber: number,
    proofImageUrl: string,
    amount: number,
    paymentDate: string
  ): Promise<{ data: PaymentProof | null; error: string | null }> {
    const user = this.auth.user();
    if (!user) return { data: null, error: 'Not authenticated' };

    const { data, error } = await this.supabase
      .from('payment_proofs')
      .insert({
        committee_id: committeeId,
        user_id: user.id,
        cycle_number: cycleNumber,
        proof_image_url: proofImageUrl,
        amount: amount,
        payment_date: paymentDate,
        status: 'pending'
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as PaymentProof, error: null };
  }

  /**
   * Get payment proofs for a committee cycle
   */
  async getPaymentProofs(
    committeeId: string,
    cycleNumber?: number
  ): Promise<{ data: PaymentProof[]; error: string | null }> {
    let query = this.supabase
      .from('payment_proofs')
      .select('*')
      .eq('committee_id', committeeId);

    if (cycleNumber) {
      query = query.eq('cycle_number', cycleNumber);
    }

    const { data, error } = await query.order('submitted_at', { ascending: false });

    if (error) return { data: [], error: error.message };
    return { data: data as PaymentProof[], error: null };
  }

  /**
   * Get user's payment proof for specific cycle
   */
  async getUserPaymentProof(
    committeeId: string,
    cycleNumber: number
  ): Promise<{ data: PaymentProof | null; error: string | null }> {
    const user = this.auth.user();
    if (!user) return { data: null, error: 'Not authenticated' };

    const { data, error } = await this.supabase
      .from('payment_proofs')
      .select('*')
      .eq('committee_id', committeeId)
      .eq('user_id', user.id)
      .eq('cycle_number', cycleNumber)
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    return { data: data as PaymentProof | null, error: null };
  }

  /**
   * Approve payment proof
   */
  async approvePaymentProof(proofId: string): Promise<{ error: string | null }> {
    const user = this.auth.user();
    if (!user) return { error: 'Not authenticated' };

    const { error } = await this.supabase
      .from('payment_proofs')
      .update({
        status: 'approved',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', proofId);

    if (error) return { error: error.message };
    return { error: null };
  }

  /**
   * Reject payment proof
   */
  async rejectPaymentProof(
    proofId: string,
    reason: string
  ): Promise<{ error: string | null }> {
    const user = this.auth.user();
    if (!user) return { error: 'Not authenticated' };

    const { error } = await this.supabase
      .from('payment_proofs')
      .update({
        status: 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason
      })
      .eq('id', proofId);

    if (error) return { error: error.message };
    return { error: null };
  }

  /**
   * Get current cycle info
   */
  async getCurrentCycleInfo(
    committeeId: string
  ): Promise<{ data: CurrentCycleInfo | null; error: string | null }> {
    const { data, error } = await this.supabase
      .rpc('get_current_cycle_info', { p_committee_id: committeeId })
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    return { data: data as CurrentCycleInfo | null, error: null };
  }

  /**
   * Get current winner's payment details
   */
  async getCurrentWinnerPaymentDetails(
    committeeId: string
  ): Promise<{ data: any | null; error: string | null }> {
    const { data, error } = await this.supabase
      .rpc('get_current_winner_payment_details', { p_committee_id: committeeId })
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  }

  /**
   * Get next winner
   */
  async getNextWinner(
    committeeId: string
  ): Promise<{ data: NextWinner | null; error: string | null }> {
    const { data, error } = await this.supabase
      .rpc('get_next_winner', { p_committee_id: committeeId })
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as NextWinner | null, error: null };
  }

  /**
   * Check if user has submitted payment proof for current cycle
   */
  async hasSubmittedPaymentProof(
    committeeId: string,
    cycleNumber: number
  ): Promise<{ submitted: boolean; error: string | null }> {
    const user = this.auth.user();
    if (!user) return { submitted: false, error: 'Not authenticated' };

    const { data, error } = await this.supabase
      .rpc('has_submitted_payment_proof', {
        p_committee_id: committeeId,
        p_user_id: user.id,
        p_cycle_number: cycleNumber
      });

    if (error) return { submitted: false, error: error.message };
    return { submitted: data as boolean, error: null };
  }

  /**
   * Initialize first cycle (admin as winner)
   */
  async initializeFirstCycle(committeeId: string): Promise<{ error: string | null }> {
    const { error } = await this.supabase
      .rpc('initialize_first_cycle', { p_committee_id: committeeId });

    if (error) return { error: error.message };
    return { error: null };
  }

  /**
   * Advance to next cycle
   */
  async advanceToNextCycle(committeeId: string): Promise<{ error: string | null }> {
    const { error } = await this.supabase
      .rpc('advance_to_next_cycle', { p_committee_id: committeeId });

    if (error) return { error: error.message };
    return { error: null };
  }

  /**
   * Get all cycles for a committee
   */
  async getCommitteeCycles(
    committeeId: string
  ): Promise<{ data: CommitteeCycle[]; error: string | null }> {
    const { data, error } = await this.supabase
      .from('committee_cycles')
      .select('*')
      .eq('committee_id', committeeId)
      .order('cycle_number', { ascending: true });

    if (error) return { data: [], error: error.message };
    return { data: data as CommitteeCycle[], error: null };
  }

  /**
   * Calculate days remaining until deadline
   */
  calculateDaysRemaining(deadline: string): number {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  /**
   * Format countdown display
   */
  formatCountdown(days: number): string {
    if (days === 0) return 'Today';
    if (days === 1) return '1 day';
    if (days < 0) return 'Overdue';
    return `${days} days`;
  }
}
