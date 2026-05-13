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

  /**
   * Recalculate trust score from all reviews.
   * Formula: (sum of ratings / max possible stars) × 100
   * e.g. ratings [3,5,4] → 12/15 × 100 = 80
   */
  async recalculateTrustScore(userId: string): Promise<void> {
    const { data: reviews } = await this.supabase
      .from('member_reviews')
      .select('rating')
      .eq('reviewed_id', userId);

    let trustScore = 95; // default when no reviews

    if (reviews && reviews.length > 0) {
      const sum = reviews.reduce((acc: number, r: any) => acc + r.rating, 0);
      const maxPossible = reviews.length * 5;
      trustScore = Math.round((sum / maxPossible) * 100);
    }

    // Save to profiles table
    await this.supabase
      .from('profiles')
      .update({ trust_score: trustScore })
      .eq('id', userId);

    console.log(`✅ Trust score updated for ${userId}: ${trustScore}`);
  }

  /** Get trust score for a user — calculated from reviews, falls back to DB */
  async getTrustScore(userId: string): Promise<number> {
    // Calculate directly from reviews (most accurate)
    const { data: reviews } = await this.supabase
      .from('member_reviews')
      .select('rating')
      .eq('reviewed_id', userId);

    if (reviews && reviews.length > 0) {
      const sum = reviews.reduce((acc: number, r: any) => acc + r.rating, 0);
      const maxPossible = reviews.length * 5;
      return Math.round((sum / maxPossible) * 100);
    }

    // No reviews — return 0 (not 95, user must earn their score)
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
