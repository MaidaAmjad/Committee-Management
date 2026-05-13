import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { ReviewService } from './review.service';

export type PaymentStatus = 'on_time' | 'slightly_late' | 'late' | 'grace_period' | 'missed' | 'pending';

export interface PaymentReliabilityRecord {
  id: string;
  user_id: string;
  committee_id: string;
  proof_id?: string;
  deadline_date: string;
  grace_end_date: string;
  submitted_date?: string;
  accepted_date?: string;
  days_late?: number;
  status: PaymentStatus;
  points_earned: number;
  month_year: string;
  created_at: string;
}

export interface ReliabilityStats {
  score: number;           // 0–100 percentage
  label: string;           // Highly Reliable, Reliable, etc.
  labelColor: string;
  labelBg: string;
  emoji: string;
  totalPayments: number;
  onTime: number;
  slightlyLate: number;
  late: number;
  gracePeriod: number;
  missed: number;
  totalPoints: number;
  maxPoints: number;
}

@Injectable({ providedIn: 'root' })
export class PaymentReliabilityService {
  private supabase;

  constructor(
    private supabaseService: SupabaseService,
    private auth: AuthService,
    private reviewService: ReviewService
  ) {
    this.supabase = this.supabaseService.client;
  }

  // ── Timing Logic ──────────────────────────────────────────────────────────

  /**
   * Determine payment status and points based on deadline and submission date.
   * deadline: YYYY-MM-DD, graceDays: number, submittedDate: YYYY-MM-DD or null
   */
  calculatePaymentStatus(
    deadlineDate: string,
    graceDays: number,
    submittedDate: string | null
  ): { status: PaymentStatus; daysLate: number; points: number } {
    if (!submittedDate) {
      return { status: 'missed', daysLate: 999, points: -10 };
    }

    const deadline = new Date(deadlineDate);
    const graceEnd = new Date(deadlineDate);
    graceEnd.setDate(graceEnd.getDate() + graceDays);
    const submitted = new Date(submittedDate);

    // Normalize to date only (no time)
    deadline.setHours(0, 0, 0, 0);
    graceEnd.setHours(0, 0, 0, 0);
    submitted.setHours(0, 0, 0, 0);

    const daysLate = Math.floor((submitted.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLate <= 0) {
      return { status: 'on_time', daysLate: 0, points: 10 };
    } else if (daysLate === 1) {
      return { status: 'slightly_late', daysLate: 1, points: 7 };
    } else if (daysLate <= 3) {
      return { status: 'late', daysLate, points: 5 };
    } else if (submitted <= graceEnd) {
      return { status: 'grace_period', daysLate, points: 2 };
    } else {
      return { status: 'missed', daysLate, points: -10 };
    }
  }

  // ── Record a payment ──────────────────────────────────────────────────────

  async recordPayment(
    userId: string,
    committeeId: string,
    proofId: string,
    deadlineDate: string,
    graceDays: number,
    submittedDate: string,
    monthYear: string,
    acceptedDate?: string
  ): Promise<{ error: string | null }> {
    const { status, daysLate, points } = this.calculatePaymentStatus(
      deadlineDate, graceDays, submittedDate
    );

    const graceEnd = new Date(deadlineDate);
    graceEnd.setDate(graceEnd.getDate() + graceDays);

    const { error } = await this.supabase
      .from('payment_reliability')
      .upsert({
        user_id: userId,
        committee_id: committeeId,
        proof_id: proofId,
        deadline_date: deadlineDate,
        grace_end_date: graceEnd.toISOString().split('T')[0],
        submitted_date: submittedDate,
        accepted_date: acceptedDate ?? new Date().toISOString().split('T')[0],
        days_late: daysLate,
        status,
        points_earned: points,
        trust_impact: points,
        month_year: monthYear,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,committee_id,month_year' });

    if (error) return { error: error.message };

    // Recalculate and save reliability score
    await this.recalculateReliabilityScore(userId);
    await this.reviewService.recalculateTrustScore(userId);
    return { error: null };
  }

  // ── Calculate score ───────────────────────────────────────────────────────

  async getReliabilityStats(userId: string): Promise<ReliabilityStats> {
    const { data: records } = await this.supabase
      .from('payment_reliability')
      .select('status, points_earned')
      .eq('user_id', userId)
      .neq('status', 'pending');

    if (!records || records.length === 0) {
      return this.defaultStats();
    }

    const stats = {
      totalPayments: records.length,
      onTime:        records.filter((r: any) => r.status === 'on_time').length,
      slightlyLate:  records.filter((r: any) => r.status === 'slightly_late').length,
      late:          records.filter((r: any) => r.status === 'late').length,
      gracePeriod:   records.filter((r: any) => r.status === 'grace_period').length,
      missed:        records.filter((r: any) => r.status === 'missed').length,
      totalPoints:   records.reduce((s: number, r: any) => s + (r.points_earned || 0), 0),
      maxPoints:     records.length * 10,
    };

    // Score = (totalPoints / maxPoints) * 100, clamped 0–100
    const rawScore = stats.maxPoints > 0
      ? Math.round((stats.totalPoints / stats.maxPoints) * 100)
      : 100;
    const score = Math.max(0, Math.min(100, rawScore));

    const { label, labelColor, labelBg } = this.getReliabilityLabel(score);

    const { emoji } = this.getReliabilityLabel(score);

    return { score, label, labelColor, labelBg, emoji, ...stats };
  }

  async recalculateReliabilityScore(userId: string): Promise<void> {
    const stats = await this.getReliabilityStats(userId);
    await this.supabase
      .from('profiles')
      .update({
        payment_reliability_score: stats.score,
        payment_reliability_label: stats.label,
      })
      .eq('id', userId);
  }

  // ── Labels ────────────────────────────────────────────────────────────────

  getReliabilityLabel(score: number): { label: string; labelColor: string; labelBg: string; emoji: string } {
    if (score <= 20) return { label: 'New User',         labelColor: '#475569', labelBg: '#f1f5f9', emoji: '🆕' };
    if (score <= 40) return { label: 'Low Reliability',  labelColor: '#ba1a1a', labelBg: '#ffdad6', emoji: '⚠️' };
    if (score <= 60) return { label: 'Moderate',         labelColor: '#854d0e', labelBg: '#fef9c3', emoji: '⚠️' };
    if (score <= 80) return { label: 'Reliable',         labelColor: '#15803d', labelBg: '#d4edda', emoji: '✅' };
    return                  { label: 'Highly Reliable',  labelColor: '#065f46', labelBg: '#d1fae5', emoji: '🏆' };
  }

  getStatusInfo(status: PaymentStatus): { label: string; color: string; bg: string; icon: string } {
    switch (status) {
      case 'on_time':       return { label: 'On Time',          color: '#15803d', bg: '#d4edda', icon: '✅' };
      case 'slightly_late': return { label: 'Slightly Late',    color: '#854d0e', bg: '#fef9c3', icon: '⚠️' };
      case 'late':          return { label: 'Late Payment',     color: '#c2410c', bg: '#fff7ed', icon: '⚠️' };
      case 'grace_period':  return { label: 'Grace Period Used',color: '#ba1a1a', bg: '#ffdad6', icon: '❌' };
      case 'missed':        return { label: 'Missed Payment',   color: '#ba1a1a', bg: '#ffdad6', icon: '🚫' };
      default:              return { label: 'Pending',          color: '#737686', bg: '#f2f4f6', icon: '⏳' };
    }
  }

  getPointsLabel(points: number): string {
    if (points > 0) return `+${points} pts`;
    if (points < 0) return `${points} pts`;
    return '0 pts';
  }

  private defaultStats(): ReliabilityStats {
    return {
      score: 0, label: 'New User',
      labelColor: '#475569', labelBg: '#f1f5f9', emoji: '🆕',
      totalPayments: 0, onTime: 0, slightlyLate: 0,
      late: 0, gracePeriod: 0, missed: 0,
      totalPoints: 0, maxPoints: 0,
    };
  }
}
