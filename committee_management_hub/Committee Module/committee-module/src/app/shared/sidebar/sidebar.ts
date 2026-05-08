import { Component, Input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

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
  @Input() trustScore = 95;
  @Input() userName = 'Committee Portal';

  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Browse', icon: 'search', route: '/browse' },
    { label: 'My Committees', icon: 'groups', route: '/my-committees' },
    { label: 'Payments', icon: 'payments', route: '/payments' },
    { label: 'Profile', icon: 'person', route: '/profile' },
  ];
}
