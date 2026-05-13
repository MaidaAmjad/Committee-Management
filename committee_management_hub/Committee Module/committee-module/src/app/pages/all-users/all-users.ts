import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SidebarComponent } from '../../shared/sidebar/sidebar';
import { TopnavComponent } from '../../shared/topnav/topnav';
import { SupabaseService } from '../../core/supabase.service';
import { AuthService } from '../../core/auth.service';
import { ReviewService } from '../../core/review.service';
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
    private reviewService: ReviewService,
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
        .select('id, full_name, email, trust_score, bio')
        .order('full_name', { ascending: true });

      if (error) throw error;

      const users: UserProfile[] = await Promise.all((data || []).map(async (p: any) => {
        const trustScore = await this.reviewService.getTrustScore(p.id);
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
          bio: p.bio ?? 'No bio provided.'
        };
      }));

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

  initials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }

  viewProfile(id: string): void {
    this.router.navigate(['/user', id]);
  }
}
