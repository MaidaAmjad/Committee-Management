import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

export interface MemberReview {
  id: string;
  reviewer_id: string;
  reviewed_id: string;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;
  // Joined
  reviewer_name?: string;
  reviewer_initials?: string;
}

export interface TrustScoreBreakdown {
  score: number;
  verificationPoints: number;
  reviewPoints: number;
  paymentPoints: number;
  participationPoints: number;
  reviewCount: number;
  averageRating: number;
  paymentCount: number;
  paymentReliability: number;
  approvedCommittees: number;
  completedCommittees: number;
  hasActivity: boolean;
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private supabase;

  constructor(
    private supabaseService: SupabaseService,
    private auth: AuthService
  ) {
    this.supabase = this.supabaseService.client;
  }

  /** Get all reviews for a user, enriched with reviewer name */
  async getReviewsForUser(userId: string): Promise<{ data: MemberReview[]; error: string | null }> {
    const { data, error } = await this.supabase
      .from('member_reviews')
      .select('*')
      .eq('reviewed_id', userId)
      .order('created_at', { ascending: false });

    if (error) return { data: [], error: error.message };
    if (!data || data.length === 0) return { data: [], error: null };

    // Fetch reviewer names from profiles
    const reviewerIds = data.map((r: any) => r.reviewer_id);
    const { data: profiles } = await this.supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', reviewerIds);

    const nameMap: Record<string, string> = {};
    (profiles || []).forEach((p: any) => { nameMap[p.id] = p.full_name; });

    const enriched: MemberReview[] = data.map((r: any) => ({
      ...r,
      reviewer_name: nameMap[r.reviewer_id] || 'Anonymous',
      reviewer_initials: (nameMap[r.reviewer_id] || 'AN')
        .split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
    }));

    return { data: enriched, error: null };
  }

  /** Get current user's review for a specific user (if any) */
  async getMyReviewFor(reviewedId: string): Promise<{ data: MemberReview | null; error: string | null }> {
    const user = this.auth.user();
    if (!user) return { data: null, error: null };

    const { data, error } = await this.supabase
      .from('member_reviews')
      .select('*')
      .eq('reviewer_id', user.id)
      .eq('reviewed_id', reviewedId)
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    return { data: data as MemberReview | null, error: null };
  }

  /** Submit or update a review — also recalculates trust score */
  async submitReview(reviewedId: string, rating: number, comment: string): Promise<{ error: string | null }> {
    const user = this.auth.user();
    if (!user) return { error: 'Not authenticated' };
    if (user.id === reviewedId) return { error: 'You cannot review yourself' };

    const { error } = await this.supabase
      .from('member_reviews')
      .upsert({
        reviewer_id: user.id,
        reviewed_id: reviewedId,
        rating,
        comment: comment.trim(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'reviewer_id,reviewed_id' });

    if (error) return { error: error.message };

    // Recalculate and save trust score
    await this.recalculateTrustScore(reviewedId);
    return { error: null };
  }

  /** Delete current user's review for a user */
  async deleteReview(reviewedId: string): Promise<{ error: string | null }> {
    const user = this.auth.user();
    if (!user) return { error: 'Not authenticated' };

    const { error } = await this.supabase
      .from('member_reviews')
      .delete()
      .eq('reviewer_id', user.id)
      .eq('reviewed_id', reviewedId);

    if (error) return { error: error.message };

    // Recalculate trust score after deletion
    await this.recalculateTrustScore(reviewedId);
    return { error: null };
  }

  /** Recalculate and persist the earned composite trust score. */
  async recalculateTrustScore(userId: string): Promise<void> {
    const trustScore = await this.getTrustScore(userId);
    await this.saveTrustScore(userId, trustScore);
  }

  /** Return the live score and keep the public profile score in sync. */
  async getAndPersistTrustScore(userId: string): Promise<number> {
    const trustScore = await this.getTrustScore(userId);
    await this.saveTrustScore(userId, trustScore);
    return trustScore;
  }

  private async saveTrustScore(userId: string, trustScore: number): Promise<void> {
    await this.supabase
      .from('profiles')
      .update({ trust_score: trustScore })
      .eq('id', userId);
  }

  /** Get the public earned trust score for a user. New accounts start at 0. */
  async getTrustScore(userId: string): Promise<number> {
    const breakdown = await this.getTrustScoreBreakdown(userId);
    return breakdown.score;
  }

  /**
   * Composite trust model:
   * - Verification: small capped boost.
   * - Reviews: grows with average rating and review count.
   * - Payments: grows with reliability and repeated payments.
   * - Committees: capped credit for approved and completed participation.
   */
  async getTrustScoreBreakdown(userId: string): Promise<TrustScoreBreakdown> {
    const [profileRes, reviewsRes, paymentsRes, membershipsRes] = await Promise.all([
      this.supabase
        .from('profiles')
        .select('is_verified')
        .eq('id', userId)
        .maybeSingle(),
      this.supabase
        .from('member_reviews')
        .select('rating')
        .eq('reviewed_id', userId),
      this.supabase
        .from('payment_reliability')
        .select('status, points_earned')
        .eq('user_id', userId)
        .neq('status', 'pending'),
      this.supabase
        .from('committee_members')
        .select('committee_id, status')
        .eq('user_id', userId),
    ]);

    const reviews = reviewsRes.data ?? [];
    const reviewCount = reviews.length;
    const averageRating = reviewCount
      ? reviews.reduce((sum: number, r: any) => sum + (r.rating ?? 0), 0) / reviewCount
      : 0;
    const reviewConfidence = Math.min(reviewCount / 5, 1);
    const reviewPoints = Math.round((averageRating / 5) * 35 * reviewConfidence);

    const payments = paymentsRes.data ?? [];
    const paymentCount = payments.length;
    const paymentTotalPoints = payments.reduce((sum: number, p: any) => sum + (p.points_earned ?? 0), 0);
    const paymentMaxPoints = paymentCount * 10;
    const paymentReliability = paymentMaxPoints
      ? Math.max(0, Math.min(100, Math.round((paymentTotalPoints / paymentMaxPoints) * 100)))
      : 0;
    const paymentPoints = Math.max(-35, Math.min(35, paymentTotalPoints));

    const memberships = membershipsRes.data ?? [];
    const approvedMemberships = memberships.filter((m: any) => m.status === 'approved');
    const committeeIds = [...new Set(approvedMemberships.map((m: any) => m.committee_id).filter(Boolean))];
    let completedCommittees = 0;

    if (committeeIds.length > 0) {
      const { data: completed } = await this.supabase
        .from('committees')
        .select('id')
        .in('id', committeeIds)
        .eq('status', 'Completed');
      completedCommittees = completed?.length ?? 0;
    }

    const approvedCommittees = approvedMemberships.length;
    const participationPoints = Math.min(20, approvedCommittees * 4 + completedCommittees * 8);
    const verificationPoints = profileRes.data?.is_verified ? 10 : 0;
    const hasActivity = Boolean(
      verificationPoints ||
      reviewCount ||
      paymentCount ||
      approvedCommittees ||
      completedCommittees
    );

    const score = hasActivity
      ? Math.max(0, Math.min(100, verificationPoints + reviewPoints + paymentPoints + participationPoints))
      : 0;

    return {
      score,
      verificationPoints,
      reviewPoints,
      paymentPoints,
      participationPoints,
      reviewCount,
      averageRating: Math.round(averageRating * 10) / 10,
      paymentCount,
      paymentReliability,
      approvedCommittees,
      completedCommittees,
      hasActivity,
    };
  }

  /** Get the review-only score for places that specifically need ratings. */
  async getReviewScore(userId: string): Promise<number> {
    const { data: reviews } = await this.supabase
      .from('member_reviews')
      .select('rating')
      .eq('reviewed_id', userId);

    if (reviews && reviews.length > 0) {
      const sum = reviews.reduce((acc: number, r: any) => acc + r.rating, 0);
      const maxPossible = reviews.length * 5;
      return Math.round((sum / maxPossible) * 100);
    }

    return 0;
  }

  /** Calculate average rating */
  getAverageRating(reviews: MemberReview[]): number {
    if (!reviews.length) return 0;
    return Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10;
  }

  formatTimeAgo(isoString: string): string {
    const diff = Date.now() - new Date(isoString).getTime();
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor(diff / 60000);
    if (days > 30) return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (mins > 0) return `${mins} minute${mins > 1 ? 's' : ''} ago`;
    return 'Just now';
  }
}
