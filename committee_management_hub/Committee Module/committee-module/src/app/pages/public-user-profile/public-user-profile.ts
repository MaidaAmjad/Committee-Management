import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { SupabaseService } from '../../core/supabase.service';
import { SidebarComponent } from '../../shared/sidebar/sidebar';
import { TopnavComponent } from '../../shared/topnav/topnav';

export interface PaymentRecord { label: string; date: string; }
export interface Review {
  avatar: string; name: string; timeAgo: string;
  rating: number; comment: string; helpful: number;
}

@Component({
  selector: 'app-public-user-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent, TopnavComponent],
  templateUrl: './public-user-profile.html',
  styleUrl: './public-user-profile.scss'
})
export class PublicUserProfileComponent {

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
    private fb: FormBuilder
  ) {
    this.editForm = this.fb.group({
      full_name: ['', [Validators.required, Validators.minLength(2)]],
      phone:     [''],
      bio:       ['', [Validators.maxLength(300)]],
    });
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
}
