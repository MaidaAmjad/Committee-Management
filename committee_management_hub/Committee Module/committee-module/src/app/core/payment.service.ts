import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { PaymentReliabilityService } from './payment-reliability.service';

export interface PaymentProof {
  id: string;
  committee_id: string;
  uploader_id: string;
  uploader_name: string;
  file_name: string;
  file_type: string;       // 'image' | 'pdf'
  file_url: string;
  month_year: string;      // e.g. "2026-05"
  status: 'submitted' | 'accepted' | 'rejected';
  accepted_at?: string | null;
  accepted_by?: string | null;
  created_at: string;
}

export interface PaymentCommittee {
  id: string;
  name: string;
  monthly_amount: number;
  duration_months: number;
  created_at: string;
  created_by: string;
  payment_deadline_date: string | null;
  grace_period_days: number;
  payment_cycle_days: number;
  status: string; // 'Recruiting' | 'Active' | 'Completed'
  // Derived fields
  due_day: number;
  winner_name: string;
  my_proof?: PaymentProof;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private supabase;

  constructor(
    private supabaseService: SupabaseService,
    private auth: AuthService,
    private reliabilityService: PaymentReliabilityService
  ) {
    this.supabase = this.supabaseService.client;
  }

  /**
   * Get all committees the current user is involved in
   * (both as admin and as approved member)
   */
  async getPaymentCommittees(): Promise<{ data: PaymentCommittee[]; error: string | null }> {
    const user = this.auth.user();
    if (!user) return { data: [], error: 'Not authenticated' };

    // Get committees user created
    const { data: owned } = await this.supabase
      .from('committees')
      .select('*')
      .eq('created_by', user.id);

    // Get committees user is an approved member of
    const { data: memberships } = await this.supabase
      .from('committee_members')
      .select('committee_id')
      .eq('user_id', user.id)
      .eq('status', 'approved');

    const memberIds = (memberships ?? []).map((m: any) => m.committee_id);

    let joined: any[] = [];
    if (memberIds.length) {
      const { data } = await this.supabase
        .from('committees')
        .select('*')
        .in('id', memberIds)
        .neq('created_by', user.id);
      joined = data ?? [];
    }

    // Merge and deduplicate
    const all = [...(owned ?? []), ...joined];
    const unique = Array.from(new Map(all.map(c => [c.id, c])).values());

    // Enrich with payment metadata
    const enriched: PaymentCommittee[] = unique.map((c: any) => ({
      ...c,
      due_day:               10,
      winner_name:           'TBD',
      payment_deadline_date: c.payment_deadline_date ?? null,
      grace_period_days:     c.grace_period_days ?? 3,
      payment_cycle_days:    c.payment_cycle_days ?? 30,
    }));

    return { data: enriched, error: null };
  }

  /** Upload payment proof to Supabase Storage */
  async uploadProof(
    committeeId: string,
    file: File,
    monthYear: string
  ): Promise<{ url: string | null; error: string | null }> {
    const user = this.auth.user();
    if (!user) return { url: null, error: 'Not authenticated' };

    const ext  = file.name.split('.').pop();
    const path = `proofs/${committeeId}/${user.id}/${monthYear}.${ext}`;

    const { error: uploadError } = await this.supabase.storage
      .from('payment-proofs')
      .upload(path, file, { upsert: true });

    if (uploadError) return { url: null, error: uploadError.message };

    const { data: urlData } = this.supabase.storage
      .from('payment-proofs')
      .getPublicUrl(path);

    return { url: urlData.publicUrl, error: null };
  }

  /** Save proof record to DB */
  async saveProof(proof: Omit<PaymentProof, 'id' | 'created_at'>): Promise<{ error: string | null }> {
    const { error } = await this.supabase.from('payment_proofs').insert(proof);
    if (error) return { error: error.message };
    return { error: null };
  }

  /** Get all proofs for a committee (for admin/receiver view) */
  async getProofsForCommittee(committeeId: string, monthYear: string): Promise<{ data: PaymentProof[]; error: string | null }> {
    const { data, error } = await this.supabase
      .from('payment_proofs')
      .select('*')
      .eq('committee_id', committeeId)
      .eq('month_year', monthYear)
      .order('created_at', { ascending: false });

    if (error) return { data: [], error: error.message };
    return { data: data as PaymentProof[], error: null };
  }

  /** Get current user's proof for a specific committee + month */
  async getMyProof(committeeId: string, monthYear: string): Promise<PaymentProof | null> {
    const user = this.auth.user();
    if (!user) return null;

    const { data } = await this.supabase
      .from('payment_proofs')
      .select('*')
      .eq('committee_id', committeeId)
      .eq('uploader_id', user.id)
      .eq('month_year', monthYear)
      .maybeSingle();

    return data as PaymentProof | null;
  }

  /** Accept a payment proof (admin only) */
  async acceptProof(proofId: string): Promise<{ error: string | null; trustImpact?: number; reliabilityLabel?: string }> {
    const admin = this.auth.user();
    const { data: proof, error: proofError } = await this.supabase
      .from('payment_proofs')
      .select('*')
      .eq('id', proofId)
      .maybeSingle();

    if (proofError) return { error: proofError.message };
    if (!proof) return { error: 'Payment proof not found' };

    const { data: committee, error: committeeError } = await this.supabase
      .from('committees')
      .select('payment_deadline_date, grace_period_days')
      .eq('id', proof.committee_id)
      .maybeSingle();

    if (committeeError) return { error: committeeError.message };

    const acceptedAt = new Date().toISOString();
    let updateResult = await this.supabase
      .from('payment_proofs')
      .update({ status: 'accepted', accepted_at: acceptedAt, accepted_by: admin?.id ?? null })
      .eq('id', proofId);

    if (updateResult.error?.message.includes('accepted_at') || (updateResult.error as any)?.code === '42703') {
      updateResult = await this.supabase
        .from('payment_proofs')
        .update({ status: 'accepted' })
        .eq('id', proofId);
    }

    if (updateResult.error) return { error: updateResult.error.message };

    const deadlineDate = committee?.payment_deadline_date ?? this.getFallbackDeadline(proof.month_year);
    const submittedDate = new Date(proof.created_at).toISOString().split('T')[0];
    const acceptedDate = acceptedAt.split('T')[0];
    const graceDays = committee?.grace_period_days ?? 3;
    const statusInfo = this.reliabilityService.calculatePaymentStatus(deadlineDate, graceDays, submittedDate);

    const { error: reliabilityError } = await this.reliabilityService.recordPayment(
      proof.uploader_id,
      proof.committee_id,
      proof.id,
      deadlineDate,
      graceDays,
      submittedDate,
      proof.month_year,
      acceptedDate
    );

    if (reliabilityError) return { error: reliabilityError };

    const stats = await this.reliabilityService.getReliabilityStats(proof.uploader_id);
    return {
      error: null,
      trustImpact: statusInfo.points,
      reliabilityLabel: stats.label,
    };
  }

  /** Reject a payment proof (admin only) */
  async rejectProof(proofId: string): Promise<{ error: string | null }> {
    const { error } = await this.supabase
      .from('payment_proofs')
      .update({ status: 'rejected' })
      .eq('id', proofId);
    return { error: error?.message ?? null };
  }

  /**
   * Compute countdown from a real deadline date string (ISO format).
   * When payment is accepted, advances to the NEXT cycle deadline.
   */
  getCountdownFromDeadline(
    deadlineDateStr: string | null,
    gracePeriodDays: number,
    paymentCycleDays: number,
    proofStatus: string | null
  ): { label: string; urgency: 'safe' | 'warning' | 'danger' | 'overdue' | 'grace' | 'missed'; paymentStatus: 'on_time' | 'late' | 'missed' | 'pending'; nextDeadline: string | null } {

    if (!deadlineDateStr) {
      return { label: 'No deadline set', urgency: 'safe', paymentStatus: 'pending', nextDeadline: null };
    }

    const now      = new Date();
    const deadline = new Date(deadlineDateStr + 'T23:59:59');
    const graceEnd = new Date(deadline);
    graceEnd.setDate(graceEnd.getDate() + gracePeriodDays);

    // ── Payment accepted → advance to next cycle ──────────────────────────
    if (proofStatus === 'accepted') {
      // Next deadline = current deadline + cycle days
      const nextDeadline = new Date(deadline);
      nextDeadline.setDate(nextDeadline.getDate() + paymentCycleDays);
      const nextDeadlineStr = nextDeadline.toISOString().split('T')[0];

      // Compute countdown to next deadline
      const diffMs   = nextDeadline.getTime() - now.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHrs  = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      let label: string;
      let urgency: 'safe' | 'warning' | 'danger' | 'overdue' | 'grace' | 'missed';

      if (diffMs <= 0) {
        label = 'Next Deadline Passed'; urgency = 'overdue';
      } else if (diffDays > 3) {
        label = `Next: ${diffDays} Days Left`; urgency = 'safe';
      } else if (diffDays >= 1) {
        label = `Next: ${diffDays}d ${diffHrs}h Left`; urgency = 'warning';
      } else if (diffHrs >= 1) {
        label = `Next: ${diffHrs}h ${diffMins}m Left`; urgency = 'danger';
      } else {
        label = `Next: ${diffMins}m Left`; urgency = 'danger';
      }

      return { label, urgency, paymentStatus: 'on_time', nextDeadline: nextDeadlineStr };
    }

    // ── Proof submitted (pending review) ─────────────────────────────────
    if (proofStatus === 'submitted') {
      const isLate = now > deadline;
      return {
        label: isLate ? 'Late Submission ⚠️' : 'Proof Submitted — Awaiting Review',
        urgency: isLate ? 'grace' : 'safe',
        paymentStatus: isLate ? 'late' : 'on_time',
        nextDeadline: null
      };
    }

    // ── Grace period expired ──────────────────────────────────────────────
    if (now > graceEnd) {
      return { label: 'Missed Payment ❌', urgency: 'missed', paymentStatus: 'missed', nextDeadline: null };
    }

    // ── In grace period ───────────────────────────────────────────────────
    const diffToGrace = graceEnd.getTime() - now.getTime();
    if (now > deadline) {
      const graceHrs  = Math.floor(diffToGrace / (1000 * 60 * 60));
      const graceDays = Math.floor(graceHrs / 24);
      const label = graceDays >= 1
        ? `Grace: ${graceDays}d ${graceHrs % 24}h Left`
        : `Grace: ${graceHrs}h Left`;
      return { label, urgency: 'grace', paymentStatus: 'pending', nextDeadline: null };
    }

    // ── Before deadline ───────────────────────────────────────────────────
    const diffToDeadline = deadline.getTime() - now.getTime();
    const days = Math.floor(diffToDeadline / (1000 * 60 * 60 * 24));
    const hrs  = Math.floor((diffToDeadline % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diffToDeadline % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 3)  return { label: `${days} Days Left`,     urgency: 'safe',    paymentStatus: 'pending', nextDeadline: null };
    if (days >= 1) return { label: `${days}d ${hrs}h Left`, urgency: 'warning', paymentStatus: 'pending', nextDeadline: null };
    if (hrs >= 1)  return { label: `${hrs}h ${mins}m Left`, urgency: 'danger',  paymentStatus: 'pending', nextDeadline: null };
    return           { label: `${mins} Minutes Left`,       urgency: 'danger',  paymentStatus: 'pending', nextDeadline: null };
  }

  /** Compute countdown string from due day (legacy fallback) */
  getCountdown(dueDay: number): { label: string; urgency: 'safe' | 'warning' | 'danger' | 'overdue' } {
    const now   = new Date();
    const due   = new Date(now.getFullYear(), now.getMonth(), dueDay, 23, 59, 59);

    // If due date already passed this month, show next month
    if (now > due) {
      return { label: 'Deadline Passed', urgency: 'overdue' };
    }

    const diffMs   = due.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHrs  = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffDays > 3) return { label: `${diffDays} Days Left`, urgency: 'safe' };
    if (diffDays >= 1) return { label: `${diffDays}d ${diffHrs}h Left`, urgency: 'warning' };
    if (diffHrs >= 1)  return { label: `${diffHrs}h ${diffMins}m Left`, urgency: 'danger' };
    return { label: `${diffMins} Minutes Left`, urgency: 'danger' };
  }

  /** Current month-year string e.g. "2026-05" */
  getCurrentMonthYear(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private getFallbackDeadline(monthYear: string): string {
    return /^\d{4}-\d{2}$/.test(monthYear) ? `${monthYear}-10` : new Date().toISOString().split('T')[0];
  }

  /** Format due date e.g. "10 May 2026" */
  formatDueDate(dueDay: number): string {
    const now  = new Date();
    const due  = new Date(now.getFullYear(), now.getMonth(), dueDay);
    return due.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  }
}
