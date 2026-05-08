import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { NotificationService } from '../../core/notification.service';

@Component({
  selector: 'app-topnav',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './topnav.html',
  styleUrl: './topnav.scss'
})
export class TopnavComponent {
  searchPlaceholder = 'Search committees, tags, or categories...';
  searchQuery = '';
  showUserMenu = false;

  // Derive display name and initials from the logged-in user
  displayName = computed(() => {
    const user = this.auth.user();
    if (!user) return '';
    return user.user_metadata?.['full_name'] || user.email?.split('@')[0] || 'User';
  });

  initials = computed(() => {
    const name = this.displayName();
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  });

  email = computed(() => this.auth.user()?.email || '');

  constructor(public auth: AuthService, public notificationService: NotificationService) {}

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  async signOut(): Promise<void> {
    this.showUserMenu = false;
    await this.auth.signOut();
  }
}
