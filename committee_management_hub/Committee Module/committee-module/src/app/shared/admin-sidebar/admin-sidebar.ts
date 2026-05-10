import { Component, computed } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AdminAuthService } from '../../core/admin-auth.service';

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './admin-sidebar.html',
})
export class AdminSidebarComponent {
  get displayName(): string { return this.adminAuth.adminName; }
  get initials(): string {
    return this.adminAuth.adminName
      .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  navItems = [
    { label: 'Overview',      icon: 'dashboard',          route: '/admin' },
    { label: 'Users',         icon: 'group',              route: '/admin/users' },
    { label: 'Committees',    icon: 'account_balance',    route: '/admin/committees' },
    { label: 'Verification',  icon: 'verified_user',      route: '/admin/verification' },
    { label: 'Reports',       icon: 'assignment_late',    route: '/admin/reports' },
  ];

  constructor(private adminAuth: AdminAuthService, private router: Router) {}

  signOut(): void {
    this.adminAuth.logout();
  }

  goToUserPortal(): void {
    this.router.navigate(['/dashboard']);
  }
}
