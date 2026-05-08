import { Component, computed } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth.service';

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
export class SidebarComponent {
  trustScore = 95;

  displayName = computed(() => {
    const user = this.auth.user();
    if (!user) return 'Committee Portal';
    return user.user_metadata?.['full_name'] || user.email?.split('@')[0] || 'User';
  });

  initials = computed(() => {
    const name = this.displayName();
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  });

  constructor(private router: Router, private auth: AuthService) {}

  goToCreateCommittee(): void {
    this.router.navigate(['/create-committee']);
  }

  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Browse', icon: 'search', route: '/browse' },
    { label: 'My Committees', icon: 'groups', route: '/my-committees' },
    { label: 'Payments', icon: 'payments', route: '/payments' },
    { label: 'Profile', icon: 'person', route: '/profile' },
  ];
}
