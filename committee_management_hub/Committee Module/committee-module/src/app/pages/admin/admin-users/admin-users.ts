import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminSidebarComponent } from '../../../shared/admin-sidebar/admin-sidebar';
import { AdminSetupBannerComponent } from '../../../shared/admin-setup-banner/admin-setup-banner';
import { AdminService, AdminUser } from '../../../core/admin.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSidebarComponent, AdminSetupBannerComponent],
  templateUrl: './admin-users.html',
})
export class AdminUsersComponent implements OnInit {
  allUsers    = signal<AdminUser[]>([]);
  loading     = signal(true);
  errorMsg    = signal('');
  searchQuery = signal('');
  statusFilter= signal<'all' | 'active' | 'suspended' | 'pending'>('all');

  selectedUser = signal<AdminUser | null>(null);
  confirmDeleteUser = signal<AdminUser | null>(null);

  filteredUsers = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const s = this.statusFilter();
    return this.allUsers().filter(u =>
      (s === 'all' || u.status === s) &&
      (!q || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    );
  });

  constructor(private adminService: AdminService) {}

  async ngOnInit(): Promise<void> {
    await this.loadUsers();
  }

  async loadUsers(): Promise<void> {
    this.loading.set(true);
    const { data, error } = await this.adminService.getAllUsers();
    this.loading.set(false);
    if (error) { this.errorMsg.set(error); return; }
    this.allUsers.set(data);
  }

  async suspendUser(user: AdminUser): Promise<void> {
    const { error } = await this.adminService.suspendUser(user.id);
    if (error) { this.errorMsg.set(error); return; }
    this.allUsers.update(list => list.map(u => u.id === user.id ? { ...u, status: 'suspended' } : u));
    if (this.selectedUser()?.id === user.id) this.selectedUser.update(u => u ? { ...u, status: 'suspended' } : u);
  }

  async reinstateUser(user: AdminUser): Promise<void> {
    const { error } = await this.adminService.reinstateUser(user.id);
    if (error) { this.errorMsg.set(error); return; }
    this.allUsers.update(list => list.map(u => u.id === user.id ? { ...u, status: 'active' } : u));
    if (this.selectedUser()?.id === user.id) this.selectedUser.update(u => u ? { ...u, status: 'active' } : u);
  }

  async confirmDelete(): Promise<void> {
    const user = this.confirmDeleteUser();
    if (!user) return;
    const { error } = await this.adminService.deleteUser(user.id);
    if (error) { this.errorMsg.set(error); return; }
    this.allUsers.update(list => list.filter(u => u.id !== user.id));
    this.confirmDeleteUser.set(null);
    if (this.selectedUser()?.id === user.id) this.selectedUser.set(null);
  }

  openDetail(user: AdminUser): void { this.selectedUser.set(user); }
  closeDetail(): void { this.selectedUser.set(null); }

  getTrustStyle(score: number) { return this.adminService.getTrustScoreStyle(score); }
  getUserStatusStyle(s: string) { return this.adminService.getUserStatusStyle(s); }

  get stats() {
    const users = this.allUsers();
    return {
      total:     users.length,
      active:    users.filter(u => u.status === 'active').length,
      suspended: users.filter(u => u.status === 'suspended').length,
      pending:   users.filter(u => u.status === 'pending').length,
      avgTrust:  users.length ? Math.round(users.reduce((s, u) => s + u.trust_score, 0) / users.length) : 0,
    };
  }
}
