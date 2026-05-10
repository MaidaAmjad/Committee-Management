import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { SupabaseService } from '../../core/supabase.service';
import { PaymentMethodService, PaymentMethod } from '../../core/payment-method.service';
import { VerificationService, VerificationRequest } from '../../core/verification.service';
import { SidebarComponent } from '../../shared/sidebar/sidebar';
import { TopnavComponent } from '../../shared/topnav/topnav';
import { VerifiedBadgeComponent } from '../../shared/verified-badge/verified-badge';

export interface PaymentRecord { label: string; date: string; }
export interface Review {
  avatar: string; name: string; timeAgo: string;
  rating: number; comment: string; helpful: number;
}

@Component({
  selector: 'app-public-user-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, SidebarComponent, TopnavComponent, VerifiedBadgeComponent],
  templateUrl: './public-user-profile.html',
  styleUrl: './public-user-profile.scss'
})
export class PublicUserProfileComponent implements OnInit {

  paymentMethods = signal<PaymentMethod[]>([]);

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
    private verificationService: VerificationService
  ) {
    this.editForm = this.fb.group({
      full_name: ['', [Validators.required, Validators.minLength(2)]],
      phone:     [''],
      bio:       ['', [Validators.maxLength(300)]],
    });
  }

  async ngOnInit(): Promise<void> {
    await this.auth.ready;
    const { data } = await this.paymentMethodService.getMyMethods();
    this.paymentMethods.set(data);
    // Load verification status
    const { data: verif } = await this.verificationService.getMyVerification();
    this.verification.set(verif);
  }

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
    const text = encodeURIComponent(
      `Hi! Check out my TrustCom profile 👋\n\nName: ${this.displayName()}\nEmail: ${this.email()}\n\nJoin me on TrustCom — the trusted platform for committee savings.\nhttps://trustcom.app`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  // ── Static data ───────────────────────────────────────────────────────────
  paymentHistory: PaymentRecord[] = [
    { label: 'May Payout - $2,500',   date: 'Completed on May 15, 2024'   },
    { label: 'April Contribution',    date: 'Completed on April 01, 2024' },
    { label: 'March Contribution',    date: 'Completed on March 01, 2024' },
  ];

  reviews: Review[] = [
    {
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBN8EcbZ0_dXDy8DnarL5DlKcC_RWpsXdxLMRAfKCgbPrXi_U6mZmkt2XGUT5GBlqKSkiK04_oKmEvzJyGr3rDuTZ7Ivv-lsHtuHE6ImkkzxQ1H_x5hrzW2ELHIAY_of8EESRtXZuE8dqeiUhpZqIdw7mI8MQILUqlnJt0TvQ3JLHzSq_OkjmqA1J-k5tHVCKLBKAjjzNprLV7tw1cBbu3qzA_zXxcN7CkL_EVSEzL9OK1CwyHejAhU6cfy2L_B6jqO404KhX2LYUU',
      name: 'Michael Ross', timeAgo: '2 days ago', rating: 5,
      comment: 'An exemplary committee member. Always makes contributions on the first of the month without reminders.',
      helpful: 12
    },
    {
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuByBs8zK-QCurIPap8b7K3XFHbBpoUIUa1Ys992n9U3nKvrI74GWww-262gpwZ5HYpGFcfMBsqGTLnJ_wTCo2IVJWOowUJR4WX5wGr5G2-hX1l2wUmP1DmZ_MqET_L8ExCFiYS-jnJWm-nHRCraEXW004TNdNXdDz6VDyZ_3-G7Vc5ZCjtqVAp5HbA0Wrwr69NA5n4dtaMaVnID3TI23WBs45V9X-E-zlwkpgeC58-FReVRVsegcDgYh4d2j2h06I9n6ABvdW5kSpY',
      name: 'Elena Rodriguez', timeAgo: '3 weeks ago', rating: 4,
      comment: 'Trustworthy and professional. A backbone of our local savings group.',
      helpful: 8
    },
  ];

  getStars(rating: number): number[] {
    return Array(5).fill(0).map((_, i) => i < rating ? 1 : 0);
  }

  getMethodInfo(type: string) {
    return this.paymentMethodService.getMethodInfo(type as any);
  }
}
