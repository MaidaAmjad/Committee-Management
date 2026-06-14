import { Component, OnInit, OnDestroy, computed, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { CommitteeService } from '../../core/committee.service';
import { ReviewService } from '../../core/review.service';
import { MobileNavService } from '../../core/mobile-nav.service';

export interface NavItem {
  label: string;
  icon: string;
  route: string;
}

interface BottomNavItem {
  label: string;
  icon: string;
  route: string;
  exact?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class SidebarComponent implements OnInit, OnDestroy {
  trustScore = signal(0);
  pendingCount = signal(0);
  private navSub?: Subscription;

  displayName = computed(() => {
    if (!this.auth.isLoggedIn) return 'Committee Portal';
    return this.auth.displayName();
  });

  initials = computed(() =>
    this.displayName().split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  );

  bottomNavItems: BottomNavItem[] = [
    { label: 'Home', icon: 'dashboard', route: '/dashboard', exact: true },
    { label: 'Browse', icon: 'search', route: '/browse' },
    { label: 'Committees', icon: 'groups', route: '/my-committees' },
    { label: 'Payments', icon: 'payments', route: '/payments' },
    { label: 'Menu', icon: 'menu', route: 'menu' },
  ];

  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'All Users', icon: 'people', route: '/all-users' },
    { label: 'Browse', icon: 'search', route: '/browse' },
    { label: 'My Committees', icon: 'groups', route: '/my-committees' },
    { label: 'Payments', icon: 'payments', route: '/payments' },
    { label: 'Profile', icon: 'person', route: '/profile' },
  ];

  constructor(
    private router: Router,
    private auth: AuthService,
    private committeeService: CommitteeService,
    private reviewService: ReviewService,
    public mobileNav: MobileNavService
  ) {}

  async ngOnInit(): Promise<void> {
    this.navSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.mobileNav.closeDrawer());

    await this.auth.ready;
    await Promise.all([this.loadPendingCount(), this.loadTrustScore()]);
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
  }

  async loadTrustScore(): Promise<void> {
    const user = this.auth.user();
    if (!user) return;
    const score = await this.reviewService.getAndPersistTrustScore(user.id);
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
    this.mobileNav.closeDrawer();
    await this.auth.signOut();
  }
}
