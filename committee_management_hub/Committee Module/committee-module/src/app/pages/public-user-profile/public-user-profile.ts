import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { SupabaseService } from '../../core/supabase.service';
import { PaymentMethodService, PaymentMethod } from '../../core/payment-method.service';
import { VerificationService, VerificationRequest } from '../../core/verification.service';
import { ReviewService, MemberReview, TrustScoreBreakdown } from '../../core/review.service';
import { PaymentReliabilityService, ReliabilityStats } from '../../core/payment-reliability.service';
import { SidebarComponent } from '../../shared/sidebar/sidebar';
import { TopnavComponent } from '../../shared/topnav/topnav';

export interface PaymentRecord { label: string; date: string; }

@Component({
  selector: 'app-public-user-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, SidebarComponent, TopnavComponent],
  templateUrl: './public-user-profile.html',
  styleUrl: './public-user-profile.scss'
})
export class PublicUserProfileComponent implements OnInit {

  paymentMethods = signal<PaymentMethod[]>([]);

  // Real reviews + trust score
  reviews        = signal<MemberReview[]>([]);
  myReview       = signal<MemberReview | null>(null);
  reviewsLoading = signal(false);
  trustScore     = signal(0);
  trustBreakdown = signal<TrustScoreBreakdown | null>(null);
  reliabilityStats = signal<ReliabilityStats | null>(null);
  showReviewForm = signal(false);
  reviewRating   = 0;
  hoverRating    = 0;
  reviewComment  = '';
  reviewSubmitting = signal(false);
  reviewError    = signal('');
  reviewSuccess  = signal(false);

  averageRating = computed(() => this.reviewService.getAverageRating(this.reviews()));

  // ── Verification ──────────────────────────────────────────────────────────
  verification       = signal<VerificationRequest | null>(null);
  showVerifyModal    = signal(false);
  verifyStep         = signal<1 | 2>(1); // step 1: form, step 2: upload docs
  verifySubmitting   = signal(false);
  verifyError        = signal('');
  verifySuccess      = signal(false);

  // Form fields
  vFullName       = '';
  vPhone          = '';
  vCnic           = '';
  vBankTitle      = '';
  vNotes          = '';

  // Field-level errors
  phoneError      = signal('');
  cnicError       = signal('');

  // Validation helpers
  private isValidPhone(phone: string): boolean {
    // Accepts: 03XX-XXXXXXX, 03XXXXXXXXX, +923XXXXXXXXX, 923XXXXXXXXX
    const cleaned = phone.replace(/[\s\-]/g, '');
    return /^(03\d{9}|\+923\d{9}|923\d{9})$/.test(cleaned);
  }

  private isValidCnic(cnic: string): boolean {
    // Accepts: XXXXX-XXXXXXX-X or XXXXXXXXXXXXX (13 digits)
    const cleaned = cnic.replace(/-/g, '');
    return /^\d{13}$/.test(cleaned);
  }

  formatCnic(value: string): string {
    // Auto-format as XXXXX-XXXXXXX-X
    const digits = value.replace(/\D/g, '').slice(0, 13);
    if (digits.length <= 5) return digits;
    if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
  }

  onCnicInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const formatted = this.formatCnic(input.value);
    this.vCnic = formatted;
    input.value = formatted;
    if (formatted.length > 0 && !this.isValidCnic(formatted)) {
      this.cnicError.set('Format: XXXXX-XXXXXXX-X (13 digits)');
    } else {
      this.cnicError.set('');
    }
  }

  onPhoneInput(): void {
    if (this.vPhone.length > 0 && !this.isValidPhone(this.vPhone)) {
      this.phoneError.set('Format: 03XX-XXXXXXX or +923XXXXXXXXX');
    } else {
      this.phoneError.set('');
    }
  }

  // File uploads
  cnicFrontFile:   File | null = null;
  cnicFrontPreview = signal('');
  selfieFile:      File | null = null;
  selfiePreview    = signal('');
  uploadingCnic    = signal(false);
  uploadingSelfie  = signal(false);
  cnicFrontUrl     = '';
  selfieUrl        = '';

  // ── Computed user data from Supabase session ──────────────────────────────
  displayName = computed(() => {
    const u = this.auth.user();
    if (!u) return 'User';
    return u.user_metadata?.['full_name'] || u.email?.split('@')[0] || 'User';
  });

  email = computed(() => this.auth.user()?.email || '');

  phone = computed(() => this.auth.user()?.user_metadata?.['phone'] || '');
  bio   = computed(() => this.auth.user()?.user_metadata?.['bio']   || '');

  initials = computed(() =>
    this.displayName().split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  );

  memberSince = computed(() => {
    const u = this.auth.user();
    if (!u?.created_at) return '';
    return new Date(u.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });

  // ── Edit modal ────────────────────────────────────────────────────────────
  showEditModal = signal(false);
  saving        = signal(false);
  saveError     = signal('');
  saveSuccess   = signal(false);

  editForm: FormGroup;

  constructor(
    public auth: AuthService,
    private supabaseService: SupabaseService,
    private fb: FormBuilder,
    private paymentMethodService: PaymentMethodService,
    private verificationService: VerificationService,
    private reviewService: ReviewService,
    private reliabilityService: PaymentReliabilityService
  ) {
    this.editForm = this.fb.group({
      full_name: ['', [Validators.required, Validators.minLength(2)]],
      phone:     [''],
      bio:       ['', [Validators.maxLength(300)]],
    });
  }

  async ngOnInit(): Promise<void> {
    await this.auth.ready;
    const user = this.auth.user();
    const { data } = await this.paymentMethodService.getMyMethods();
    this.paymentMethods.set(data);
    // Load verification status
    const { data: verif } = await this.verificationService.getMyVerification();
    this.verification.set(verif);
    // Load real reviews + trust score for current user
    if (user) {
      await this.loadReviews(user.id);
    }
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

  // ── Review form (own profile — can't review yourself, but can see reviews) ──
  setRating(r: number): void { this.reviewRating = r; }
  setHover(r: number): void  { this.hoverRating = r; }
  clearHover(): void         { this.hoverRating = 0; }
  getStarFill(star: number): boolean {
    return star <= (this.hoverRating || this.reviewRating);
  }
  formatTime(iso: string): string { return this.reviewService.formatTimeAgo(iso); }

  // ── Verification Modal ────────────────────────────────────────────────────

  openVerifyModal(): void {
    const u = this.auth.user();
    this.vFullName = u?.user_metadata?.['full_name'] || '';
    this.vPhone    = u?.user_metadata?.['phone'] || '';
    this.vCnic = ''; this.vBankTitle = ''; this.vNotes = '';
    this.cnicFrontFile = null; this.selfieFile = null;
    this.cnicFrontPreview.set(''); this.selfiePreview.set('');
    this.cnicFrontUrl = ''; this.selfieUrl = '';
    this.verifyError.set(''); this.verifySuccess.set(false);
    this.phoneError.set(''); this.cnicError.set('');
    this.verifyStep.set(1);
    this.showVerifyModal.set(true);
  }

  closeVerifyModal(): void { this.showVerifyModal.set(false); }

  goToStep2(): void {
    this.verifyError.set('');
    this.phoneError.set('');
    this.cnicError.set('');

    if (!this.vFullName.trim()) {
      this.verifyError.set('Full Name is required.');
      return;
    }
    if (!this.vPhone.trim()) {
      this.verifyError.set('Phone Number is required.');
      return;
    }
    if (!this.isValidPhone(this.vPhone)) {
      this.phoneError.set('Format: 03XX-XXXXXXX or +923XXXXXXXXX');
      this.verifyError.set('Please enter a valid Pakistani phone number.');
      return;
    }
    if (!this.vCnic.trim()) {
      this.verifyError.set('CNIC Number is required.');
      return;
    }
    if (!this.isValidCnic(this.vCnic)) {
      this.cnicError.set('Format: XXXXX-XXXXXXX-X (13 digits)');
      this.verifyError.set('Please enter a valid CNIC number.');
      return;
    }

    this.verifyStep.set(2);
  }

  onCnicFrontSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!['image/jpeg','image/png','application/pdf'].includes(file.type)) {
      this.verifyError.set('Only JPG, PNG, or PDF allowed.'); return;
    }
    if (file.size > 5 * 1024 * 1024) { this.verifyError.set('File must be under 5MB.'); return; }
    this.cnicFrontFile = file;
    if (file.type.startsWith('image')) {
      const reader = new FileReader();
      reader.onload = e => this.cnicFrontPreview.set(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      this.cnicFrontPreview.set('pdf');
    }
    this.verifyError.set('');
  }

  onSelfieSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!['image/jpeg','image/png'].includes(file.type)) {
      this.verifyError.set('Selfie must be JPG or PNG.'); return;
    }
    if (file.size > 5 * 1024 * 1024) { this.verifyError.set('File must be under 5MB.'); return; }
    this.selfieFile = file;
    const reader = new FileReader();
    reader.onload = e => this.selfiePreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
    this.verifyError.set('');
  }

  async submitVerification(): Promise<void> {
    if (!this.cnicFrontFile || !this.selfieFile) {
      this.verifyError.set('Please upload both CNIC front image and selfie.'); return;
    }
    this.verifySubmitting.set(true);
    this.verifyError.set('');

    // Upload CNIC front
    this.uploadingCnic.set(true);
    const { url: cnicUrl, error: cnicErr } = await this.verificationService.uploadDocument(this.cnicFrontFile, 'cnic_front');
    this.uploadingCnic.set(false);
    if (cnicErr || !cnicUrl) {
      this.verifyError.set('Failed to upload CNIC image: ' + (cnicErr || 'Unknown error'));
      this.verifySubmitting.set(false); return;
    }

    // Upload selfie
    this.uploadingSelfie.set(true);
    const { url: selfieUrl, error: selfieErr } = await this.verificationService.uploadDocument(this.selfieFile, 'selfie');
    this.uploadingSelfie.set(false);
    if (selfieErr || !selfieUrl) {
      this.verifyError.set('Failed to upload selfie: ' + (selfieErr || 'Unknown error'));
      this.verifySubmitting.set(false); return;
    }

    // Submit verification
    const { error } = await this.verificationService.submitVerification({
      full_name:          this.vFullName.trim(),
      phone_number:       this.vPhone.trim(),
      cnic_number:        this.vCnic.trim(),
      cnic_front_url:     cnicUrl,
      selfie_url:         selfieUrl,
      bank_account_title: this.vBankTitle.trim() || undefined,
      additional_notes:   this.vNotes.trim() || undefined,
    });

    this.verifySubmitting.set(false);
    if (error) { this.verifyError.set(error); return; }

    this.verifySuccess.set(true);
    // Refresh verification status
    const { data: verif } = await this.verificationService.getMyVerification();
    this.verification.set(verif);
    setTimeout(() => this.showVerifyModal.set(false), 2000);
  }

  get verificationStatus(): 'none' | 'pending' | 'approved' | 'rejected' {
    const v = this.verification();
    if (!v) return 'none';
    return v.status as any;
  }

  openEditModal(): void {
    this.editForm.patchValue({
      full_name: this.displayName(),
      phone:     this.phone(),
      bio:       this.bio(),
    });
    this.saveError.set('');
    this.saveSuccess.set(false);
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
  }

  async saveProfile(): Promise<void> {
    if (this.editForm.invalid) return;
    this.saving.set(true);
    this.saveError.set('');

    const { error } = await this.supabaseService.client.auth.updateUser({
      data: {
        full_name: this.editForm.value.full_name,
        phone:     this.editForm.value.phone,
        bio:       this.editForm.value.bio,
      }
    });

    this.saving.set(false);

    if (error) {
      this.saveError.set(error.message);
      return;
    }

    this.saveSuccess.set(true);
    setTimeout(() => {
      this.showEditModal.set(false);
      this.saveSuccess.set(false);
    }, 1500);
  }

  // ── Share via Gmail ───────────────────────────────────────────────────────
  shareViaGmail(): void {
    const subject = encodeURIComponent(`Check out ${this.displayName()}'s TrustCom Profile`);
    const body    = encodeURIComponent(
      `Hi,\n\nI'd like to share my TrustCom profile with you.\n\nName: ${this.displayName()}\nEmail: ${this.email()}\n\nJoin me on TrustCom — the trusted platform for committee savings.\n\nhttps://trustcom.app`
    );
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`, '_blank');
  }

  // ── Share via WhatsApp ────────────────────────────────────────────────────
  shareViaWhatsApp(): void {
    const url = this.whatsappChatUrl();
    if (!url) return;
    window.open(url, '_blank');
  }

  whatsappChatUrl(): string | null {
    const number = this.normalizeWhatsAppNumber(this.phone());
    if (!number) return null;

    const message = encodeURIComponent(`Hi ${this.displayName()}, I found your TrustCom profile and would like to connect.`);
    return `https://wa.me/${number}?text=${message}`;
  }

  private normalizeWhatsAppNumber(phone: string): string | null {
    const trimmed = phone.trim();
    if (!trimmed) return null;

    let digits = trimmed.replace(/\D/g, '');
    if (digits.startsWith('00')) digits = digits.slice(2);
    if (digits.startsWith('0')) digits = `92${digits.slice(1)}`;

    return digits.length >= 10 ? digits : null;
  }

  getMethodInfo(type: string) {
    return this.paymentMethodService.getMethodInfo(type as any);
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
