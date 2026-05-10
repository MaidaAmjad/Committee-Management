import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SidebarComponent } from '../../shared/sidebar/sidebar';
import { TopnavComponent } from '../../shared/topnav/topnav';
import { ProfileService, UserProfile } from '../../core/profile.service';
import { AuthService } from '../../core/auth.service';
import { VerificationService } from '../../core/verification.service';

@Component({
  selector: 'app-user-profile-view',
  standalone: true,
  imports: [CommonModule, RouterLink, SidebarComponent, TopnavComponent],
  templateUrl: './user-profile-view.html',
  styleUrl: './user-profile-view.scss'
})
export class UserProfileViewComponent implements OnInit {
  profile      = signal<UserProfile | null>(null);
  committees   = signal<any[]>([]);
  loading      = signal(true);
  errorMsg     = signal('');
  isVerified   = signal(false);

  currentUserId = computed(() => this.auth.user()?.id ?? '');
  isOwnProfile  = computed(() => this.profile()?.id === this.currentUserId());

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private profileService: ProfileService,
    private auth: AuthService,
    private verificationService: VerificationService
  ) {}

  async ngOnInit(): Promise<void> {
    const userId = this.route.snapshot.paramMap.get('id');
    if (!userId) { this.router.navigate(['/browse']); return; }

    await this.auth.ready;
    this.loading.set(true);

    const [profileRes, committeesRes] = await Promise.all([
      this.profileService.getProfile(userId),
      this.profileService.getCommitteesByUser(userId),
    ]);

    this.loading.set(false);

    if (profileRes.error || !profileRes.data) {
      const fallback = await this.profileService.getProfileFromMembers(userId);
      if (fallback) {
        this.profile.set(fallback);
      } else {
        this.errorMsg.set('Profile not found. The user may need to log in once to generate their profile.');
        return;
      }
    } else {
      this.profile.set(profileRes.data);
    }

    this.committees.set(committeesRes.data);

    // Load verification status
    const status = await this.verificationService.getUserVerificationStatus(userId);
    this.isVerified.set(status === 'approved');
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getMemberSince(): string {
    const p = this.profile();
    if (!p?.created_at) return '';
    return new Date(p.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  goToCommittee(id: string): void {
    this.router.navigate(['/committee', id]);
  }
}
