import { Component, OnInit, computed, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth.service';
import { CommitteeService } from '../../core/committee.service';
import { ReviewService } from '../../core/review.service';

export interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class SidebarComponent implements OnInit {
  trustScore = signal(0);
  pendingCount = signal(0);

  displayName = computed(() => {
    const user = this.auth.user();
    if (!user) return 'Committee Portal';
    return user.user_metadata?.['full_name'] || user.email?.split('@')[0] || 'User';
  });

  initials = computed(() =>
    this.displayName().split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  );

  constructor(
    private router: Router,
    private auth: AuthService,
    private committeeService: CommitteeService,
    private reviewService: ReviewService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.auth.ready;
    await Promise.all([
      this.loadPendingCount(),
      this.loadTrustScore(),
    ]);
  }

  async loadTrustScore(): Promise<void> {
    const user = this.auth.user();
    if (!user) return;
    const score = await this.reviewService.getTrustScore(user.id);
    this.trustScore.set(score);
  }

  async loadPendingCount(): Promise<void> {
    try {
      const { data } = await this.committeeService.getPendingRequests();
      this.pendingCount.set(data.length);
    } catch {
      this.pendingCount.set(0);
    }
  }

  goToCreateCommittee(): void {
    this.router.navigate(['/create-committee']);
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
  }

  navItems: NavItem[] = [
    { label: 'Dashboard',      icon: 'dashboard',        route: '/dashboard' },
    { label: 'All Users',      icon: 'people',           route: '/all-users' },
    { label: 'Browse',         icon: 'search',           route: '/browse' },
    { label: 'My Committees',  icon: 'groups',           route: '/my-committees' },
    { label: 'Payments',       icon: 'payments',         route: '/payments' },
    { label: 'Profile',        icon: 'person',           route: '/profile' },
  ];
}
