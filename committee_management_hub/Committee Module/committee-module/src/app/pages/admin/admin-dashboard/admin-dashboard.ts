import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminSidebarComponent } from '../../../shared/admin-sidebar/admin-sidebar';
import { AdminSetupBannerComponent } from '../../../shared/admin-setup-banner/admin-setup-banner';
import { AdminService, AdminStats, AdminUser, AdminCommittee, AdminReport } from '../../../core/admin.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, AdminSidebarComponent, AdminSetupBannerComponent],
  templateUrl: './admin-dashboard.html',
})
export class AdminDashboardComponent implements OnInit {
  stats    = signal<AdminStats | null>(null);
  recentUsers       = signal<AdminUser[]>([]);
  recentCommittees  = signal<AdminCommittee[]>([]);
  openReports       = signal<AdminReport[]>([]);
  loading  = signal(true);
  errorMsg = signal('');

  constructor(private adminService: AdminService) {}

  async ngOnInit(): Promise<void> {
    this.loading.set(true);

    const [statsRes, usersRes, committeesRes, reportsRes] = await Promise.all([
      this.adminService.getStats(),
      this.adminService.getAllUsers(),
      this.adminService.getAllCommittees(),
      this.adminService.getReports(),
    ]);

    this.loading.set(false);

    if (statsRes.error) { this.errorMsg.set(statsRes.error); return; }

    this.stats.set(statsRes.data);
    this.recentUsers.set(usersRes.data.slice(0, 5));
    this.recentCommittees.set(committeesRes.data.slice(0, 4));
    this.openReports.set(reportsRes.data.filter(r => r.status === 'open').slice(0, 3));
  }

  formatCurrency(n: number): string { return this.adminService.formatCurrency(n); }
  getTrustStyle(score: number) { return this.adminService.getTrustScoreStyle(score); }
  getUserStatusStyle(s: string) { return this.adminService.getUserStatusStyle(s); }
  getCommitteeStatusStyle(s: string) { return this.adminService.getCommitteeStatusStyle(s); }
  getSeverityStyle(s: string) { return this.adminService.getSeverityStyle(s); }

  timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }
}
