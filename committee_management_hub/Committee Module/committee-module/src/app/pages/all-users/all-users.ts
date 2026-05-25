import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SidebarComponent } from '../../shared/sidebar/sidebar';
import { TopnavComponent } from '../../shared/topnav/topnav';
import { SupabaseService } from '../../core/supabase.service';
import { AuthService } from '../../core/auth.service';
import { PaymentReliabilityService } from '../../core/payment-reliability.service';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  trust_score: number;
  reliability_label: string;
  reliability_emoji: string;
  reliability_color: string;
  reliability_bg: string;
  is_verified?: boolean;
  payment_reliability_score?: number | null;
  bio: string | null;
}

@Component({
  selector: 'app-all-users',
  standalone: true,
  imports: [CommonModule, SidebarComponent, TopnavComponent],
  templateUrl: './all-users.html',
  styleUrl: './all-users.scss'
})
export class AllUsersComponent implements OnInit {
  loading = signal(true);
  errorMsg = signal('');
  searchQuery = signal('');
  allUsers = signal<UserProfile[]>([]);

  filteredUsers = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return this.allUsers().filter(u =>
      !q || 
      (u.full_name && u.full_name.toLowerCase().includes(q)) || 
      (u.email && u.email.toLowerCase().includes(q))
    );
  });

  private supabase;

  constructor(
    private supabaseService: SupabaseService,
    private auth: AuthService,
    private router: Router,
    private reliabilityService: PaymentReliabilityService
  ) {
    this.supabase = this.supabaseService.client;
  }

  async ngOnInit(): Promise<void> {
    await this.auth.ready;
    await this.loadUsers();
  }

  async loadUsers(): Promise<void> {
    this.loading.set(true);
    this.errorMsg.set('');

    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('id, full_name, email, trust_score, is_verified, payment_reliability_score, bio')
        .order('full_name', { ascending: true });

      if (error) throw error;

      const users: UserProfile[] = (data || []).map((p: any) => {
        const trustScore = this.normalizeTrustScore(p);
        const label = this.reliabilityService.getReliabilityLabel(trustScore);
        return {
          id: p.id,
          full_name: p.full_name || p.email?.split('@')[0] || 'Unknown User',
          email: p.email,
          trust_score: trustScore,
          reliability_label: label.label,
          reliability_emoji: label.emoji,
          reliability_color: label.labelColor,
          reliability_bg: label.labelBg,
          is_verified: p.is_verified,
          payment_reliability_score: p.payment_reliability_score,
          bio: p.bio ?? 'No bio provided.'
        };
      });

      this.allUsers.set(users);
    } catch (error: any) {
      console.error('Error loading users:', error);
      this.errorMsg.set(error.message || 'Failed to load users');
    } finally {
      this.loading.set(false);
    }
  }

  onSearch(val: string): void {
    this.searchQuery.set(val);
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

  initials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }

  viewProfile(id: string): void {
    this.router.navigate(['/user', id]);
  }
}
