import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../core/supabase.service';
import { GuestGuardService } from '../../core/guest-guard.service';
import { SignInPopupComponent } from '../../shared/sign-in-popup/sign-in-popup';

interface PublicUser {
  id: string;
  full_name: string;
  email: string;
  trust_score: number;
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
    private router: Router
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
    this.users.set((data || []) as PublicUser[]);
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getTrustColor(score: number): string {
    if (score >= 90) return '#15803d';
    if (score >= 70) return '#854d0e';
    return '#ba1a1a';
  }

  getTrustBg(score: number): string {
    if (score >= 90) return '#d4edda';
    if (score >= 70) return '#fef9c3';
    return '#ffdad6';
  }

  goBack(): void { this.router.navigate(['/']); }
}
