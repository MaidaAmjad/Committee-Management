import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../core/supabase.service';
import { GuestGuardService } from '../../core/guest-guard.service';
import { SignInPopupComponent } from '../../shared/sign-in-popup/sign-in-popup';
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
  payment_reliability_score?: number | null;
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
    private reliabilityService: PaymentReliabilityService
  ) {
    this.supabase = this.supabaseService.client;
  }

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    const { data } = await this.supabase
      .from('profiles')
      .select('id, full_name, email, trust_score, is_verified, payment_reliability_score, created_at')
      .order('trust_score', { ascending: false });
    this.loading.set(false);
    const users = (data || []).map((user: any) => {
      const trustScore = this.normalizeTrustScore(user);
      const label = this.reliabilityService.getReliabilityLabel(trustScore);
      return {
        ...user,
        trust_score: trustScore,
        reliability_label: label.label,
        reliability_emoji: label.emoji,
        reliability_color: label.labelColor,
        reliability_bg: label.labelBg,
      } as PublicUser;
    });
    this.users.set(users.sort((a, b) =>
      b.trust_score - a.trust_score || a.full_name.localeCompare(b.full_name)
    ));
  }

  private normalizeTrustScore(user: any): number {
    const numericScore = Number(user?.trust_score ?? 0);
    if (Number.isNaN(numericScore)) return 0;
    const score = Math.max(0, Math.min(100, Math.round(numericScore)));
    const reliabilityScore = Number(user?.payment_reliability_score ?? 0);
    const hasReliabilityHistory = !Number.isNaN(reliabilityScore) && reliabilityScore > 0;

    // Older profile rows used 95 as the default. If there is no public evidence
    // of earned trust, keep those users as new users until the DB migration runs.
    if (score === 95 && !user?.is_verified && !hasReliabilityHistory) return 0;
    return score;
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
