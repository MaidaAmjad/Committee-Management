import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../core/supabase.service';
import { GuestGuardService } from '../../core/guest-guard.service';
import { SignInPopupComponent } from '../../shared/sign-in-popup/sign-in-popup';
import { ReviewService } from '../../core/review.service';
import { PaymentReliabilityService } from '../../core/payment-reliability.service';

interface PublicUser {
  id: string;
  full_name: string;
  email: string;
  trust_score: number;
  reliability_label: string;
  reliability_emoji: string;
  reliability_color: string;
  reliability_bg: string;
  is_verified: boolean;
  created_at: string;
}

@Component({
  selector: 'app-users-preview',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SignInPopupComponent],
  templateUrl: './users-preview.html',
})
export class UsersPreviewComponent implements OnInit {
  users    = signal<PublicUser[]>([]);
  loading  = signal(true);
  search   = signal('');
  private supabase;

  filtered = computed(() => {
    const q = this.search().toLowerCase();
    return this.users().filter(u =>
      !q || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  });

  constructor(
    private supabaseService: SupabaseService,
    public guestGuard: GuestGuardService,
    private router: Router,
    private reviewService: ReviewService,
    private reliabilityService: PaymentReliabilityService
  ) {
    this.supabase = this.supabaseService.client;
  }

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    const { data } = await this.supabase
      .from('profiles')
      .select('id, full_name, email, trust_score, is_verified, created_at')
      .order('trust_score', { ascending: false });
    this.loading.set(false);
    const users = await Promise.all((data || []).map(async (user: any) => {
      const trustScore = await this.reviewService.getTrustScore(user.id);
      const label = this.reliabilityService.getReliabilityLabel(trustScore);
      return {
        ...user,
        trust_score: trustScore,
        reliability_label: label.label,
        reliability_emoji: label.emoji,
        reliability_color: label.labelColor,
        reliability_bg: label.labelBg,
      } as PublicUser;
    }));
    this.users.set(users);
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getTrustColor(score: number): string {
    return this.reliabilityService.getReliabilityLabel(score).labelColor;
  }

  getTrustBg(score: number): string {
    return this.reliabilityService.getReliabilityLabel(score).labelBg;
  }

  goBack(): void { this.router.navigate(['/']); }
}
