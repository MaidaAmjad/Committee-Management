import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SidebarComponent } from '../../shared/sidebar/sidebar';
import { TopnavComponent } from '../../shared/topnav/topnav';
import { ProfileService, UserProfile } from '../../core/profile.service';
import { AuthService } from '../../core/auth.service';
import { VerificationService } from '../../core/verification.service';
import { ReviewService, MemberReview, TrustScoreBreakdown } from '../../core/review.service';
import { GuestGuardService } from '../../core/guest-guard.service';
import { SignInPopupComponent } from '../../shared/sign-in-popup/sign-in-popup';
import { PaymentReliabilityService, ReliabilityStats } from '../../core/payment-reliability.service';

@Component({
  selector: 'app-user-profile-view',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidebarComponent, TopnavComponent, SignInPopupComponent],
  templateUrl: './user-profile-view.html',
  styleUrl: './user-profile-view.scss'
})
export class UserProfileViewComponent implements OnInit {
  profile      = signal<UserProfile | null>(null);
  committees   = signal<any[]>([]);
  loading      = signal(true);
  errorMsg     = signal('');
  isVerified   = signal(false);

  // Reviews
  reviews        = signal<MemberReview[]>([]);
  myReview       = signal<MemberReview | null>(null);
  reviewsLoading = signal(false);
  showReviewForm = signal(false);
  reviewRating   = 0;
  hoverRating    = 0;
  reviewComment  = '';
  reviewSubmitting = signal(false);
  reviewError    = signal('');
  reviewSuccess  = signal(false);
  trustScore     = signal(0);
  trustBreakdown = signal<TrustScoreBreakdown | null>(null);
  reliabilityStats = signal<ReliabilityStats | null>(null);

  currentUserId = computed(() => this.auth.user()?.id ?? '');
  isOwnProfile  = computed(() => this.profile()?.id === this.currentUserId());

  averageRating = computed(() => this.reviewService.getAverageRating(this.reviews()));

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private profileService: ProfileService,
    private auth: AuthService,
    private verificationService: VerificationService,
    private reviewService: ReviewService,
    public guestGuard: GuestGuardService,
    private reliabilityService: PaymentReliabilityService
  ) {}

  isGuest = computed(() => !this.auth.user());

  async ngOnInit(): Promise<void> {
    const userId = this.route.snapshot.paramMap.get('id');
    if (!userId) { this.router.navigate(['/browse']); return; }

    // Don't wait for auth for guests
    if (!this.guestGuard.isGuest()) {
      await this.auth.ready;
    }
    this.loading.set(true);

    const [profileRes, committeesRes] = await Promise.all([
      this.profileService.getProfile(userId),
      this.profileService.getCommitteesByUser(userId),
    ]);

    this.loading.set(false);

    if (profileRes.error || !profileRes.data) {
      const fallback = await this.profileService.getProfileFromMembers(userId);
      if (fallback) {
        this.profile.set(fallback);
      } else {
        this.errorMsg.set('Profile not found.');
        return;
      }
    } else {
      this.profile.set(profileRes.data);
    }

    this.committees.set(committeesRes.data);

    // Load verification + reviews in parallel
    const [verStatus] = await Promise.all([
      this.verificationService.getUserVerificationStatus(userId),
      this.loadReviews(userId),
    ]);
    this.isVerified.set(verStatus === 'approved');
  }

  private async loadReviews(userId: string): Promise<void> {
    this.reviewsLoading.set(true);
    const [reviewsRes, myReviewRes, breakdown, reliability] = await Promise.all([
      this.reviewService.getReviewsForUser(userId),
      this.reviewService.getMyReviewFor(userId),
      this.reviewService.getTrustScoreBreakdown(userId),
      this.reliabilityService.getReliabilityStats(userId),
    ]);
    this.reviewsLoading.set(false);
    if (!reviewsRes.error) this.reviews.set(reviewsRes.data);
    if (!myReviewRes.error) {
      this.myReview.set(myReviewRes.data);
      if (myReviewRes.data) {
        this.reviewRating = myReviewRes.data.rating;
        this.reviewComment = myReviewRes.data.comment;
      }
    }
    this.trustScore.set(breakdown.score);
    this.trustBreakdown.set(breakdown);
    this.reliabilityStats.set(reliability);
  }

  // ── Review form ───────────────────────────────────────────────────────────

  openReviewForm(): void {
    this.reviewError.set('');
    this.reviewSuccess.set(false);
    this.showReviewForm.set(true);
  }

  closeReviewForm(): void {
    this.showReviewForm.set(false);
    this.reviewError.set('');
  }

  setRating(r: number): void { this.reviewRating = r; }
  setHover(r: number): void  { this.hoverRating = r; }
  clearHover(): void         { this.hoverRating = 0; }

  getStarFill(star: number): boolean {
    return star <= (this.hoverRating || this.reviewRating);
  }

  async submitReview(): Promise<void> {
    const profile = this.profile();
    if (!profile) return;
    if (this.reviewRating === 0) { this.reviewError.set('Please select a star rating.'); return; }
    if (this.reviewComment.trim().length < 5) { this.reviewError.set('Comment must be at least 5 characters.'); return; }

    this.reviewSubmitting.set(true);
    this.reviewError.set('');

    const { error } = await this.reviewService.submitReview(
      profile.id, this.reviewRating, this.reviewComment
    );

    this.reviewSubmitting.set(false);

    if (error) { this.reviewError.set(error); return; }

    this.reviewSuccess.set(true);
    await this.loadReviews(profile.id);
    setTimeout(() => {
      this.showReviewForm.set(false);
      this.reviewSuccess.set(false);
    }, 1500);
  }

  async deleteReview(): Promise<void> {
    const profile = this.profile();
    if (!profile) return;
    const { error } = await this.reviewService.deleteReview(profile.id);
    if (!error) {
      this.myReview.set(null);
      this.reviewRating = 0;
      this.reviewComment = '';
      await this.loadReviews(profile.id);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getMemberSince(): string {
    const p = this.profile();
    if (!p?.created_at) return '';
    return new Date(p.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  formatTime(iso: string): string {
    return this.reviewService.formatTimeAgo(iso);
  }

  goToCommittee(id: string): void {
    this.router.navigate(['/committee', id]);
  }

  trustLabel(): string {
    return this.reliabilityService.getReliabilityLabel(this.trustScore()).label;
  }

  trustEmoji(): string {
    return this.reliabilityService.getReliabilityLabel(this.trustScore()).emoji;
  }

  trustColor(): string {
    return this.reliabilityService.getReliabilityLabel(this.trustScore()).labelColor;
  }

  trustBg(): string {
    return this.reliabilityService.getReliabilityLabel(this.trustScore()).labelBg;
  }

  hasTrustHistory(): boolean {
    return this.trustBreakdown()?.hasActivity ?? false;
  }
}
