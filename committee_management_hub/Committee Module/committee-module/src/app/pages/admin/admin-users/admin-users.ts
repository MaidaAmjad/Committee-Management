import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminSidebarComponent } from '../../../shared/admin-sidebar/admin-sidebar';
import {  } from '../../../shared/admin-setup-banner/admin-setup-banner';
import { AdminService, AdminUser } from '../../../core/admin.service';
import { SupabaseService } from '../../../core/supabase.service';

/** Extended profile loaded when the drawer opens */
export interface UserDetail extends AdminUser {
  bio: string | null;
  phone: string | null;
  committees: { id: string; name: string; status: string; role: 'admin' | 'member' }[];
  paymentMethods: { method_type: string; account_title: string; account_number: string; is_primary: boolean }[];
  proofStats: { submitted: number; accepted: number; rejected: number };
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSidebarComponent],
  templateUrl: './admin-users.html',
})
export class AdminUsersComponent implements OnInit {
  allUsers    = signal<AdminUser[]>([]);
  loading     = signal(true);
  errorMsg    = signal('');
  successMsg  = signal('');
  searchQuery = signal('');
  statusFilter = signal<'all' | 'active' | 'suspended' | 'pending'>('all');

  selectedUser   = signal<UserDetail | null>(null);
  loadingDetail  = signal(false);
  confirmDeleteUser = signal<AdminUser | null>(null);

  filteredUsers = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const s = this.statusFilter();
    return this.allUsers().filter(u =>
      (s === 'all' || u.status === s) &&
      (!q || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    );
  });

  constructor(
    private adminService: AdminService,
    private supabaseService: SupabaseService,
  ) {}

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

  /** Opens the detail drawer and fetches full user info from Supabase */
  async openDetail(user: AdminUser): Promise<void> {
    // Show drawer immediately with basic info while extended data loads
    this.selectedUser.set({ ...user, bio: null, phone: null, committees: [], paymentMethods: [], proofStats: { submitted: 0, accepted: 0, rejected: 0 } });
    this.loadingDetail.set(true);

    const supabase = this.supabaseService.client;

    const [profileRes, membershipsRes, paymentMethodsRes, proofsRes] = await Promise.all([
      // Full profile row
      supabase.from('profiles').select('bio, phone').eq('id', user.id).maybeSingle(),
      // All committee memberships with committee details
      supabase.from('committee_members')
        .select('status, committees(id, name, status, created_by)')
        .eq('user_id', user.id),
      // Payment methods
      supabase.from('payment_methods')
        .select('method_type, account_title, account_number, is_primary')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false }),
      // Payment proof stats
      supabase.from('payment_proofs')
        .select('status')
        .eq('uploader_id', user.id),
    ]);

    // Build committees list
    const committees: UserDetail['committees'] = [];
    for (const m of (membershipsRes.data ?? [])) {
      const c = (m as any).committees;
      if (!c) continue;
      committees.push({
        id:     c.id,
        name:   c.name,
        status: c.status,
        role:   c.created_by === user.id ? 'admin' : 'member',
      });
    }

    // Proof stats
    const proofs = (proofsRes.data ?? []) as any[];
    const proofStats = {
      submitted: proofs.filter(p => p.status === 'submitted').length,
      accepted:  proofs.filter(p => p.status === 'accepted').length,
      rejected:  proofs.filter(p => p.status === 'rejected').length,
    };

    this.loadingDetail.set(false);
    this.selectedUser.set({
      ...user,
      bio:            profileRes.data?.bio ?? null,
      phone:          profileRes.data?.phone ?? null,
      committees,
      paymentMethods: (paymentMethodsRes.data ?? []) as UserDetail['paymentMethods'],
      proofStats,
    });
  }

  closeDetail(): void { this.selectedUser.set(null); }

  async suspendUser(user: AdminUser): Promise<void> {
    if (!confirm(`Suspend ${user.full_name}? They will not be able to log in or sign up again with ${user.email}.`)) {
      return;
    }
    this.errorMsg.set('');
    this.successMsg.set('');
    const { error } = await this.adminService.suspendUser(user.id);
    if (error) { this.errorMsg.set(error); return; }
    this.successMsg.set(`${user.full_name} has been suspended.`);
    this.allUsers.update(list => list.map(u => u.id === user.id ? { ...u, status: 'suspended' as const } : u));
    if (this.selectedUser()?.id === user.id) this.selectedUser.update(u => u ? { ...u, status: 'suspended' as const } : u);
  }

  async reinstateUser(user: AdminUser): Promise<void> {
    const { error } = await this.adminService.reinstateUser(user.id);
    if (error) { this.errorMsg.set(error); return; }
    this.allUsers.update(list => list.map(u => u.id === user.id ? { ...u, status: 'active' as const } : u));
    if (this.selectedUser()?.id === user.id) this.selectedUser.update(u => u ? { ...u, status: 'active' as const } : u);
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

  getMethodIcon(type: string): string {
    switch (type) {
      case 'jazzcash':  return 'phone_iphone';
      case 'easypaisa': return 'phone_android';
      case 'bank':      return 'account_balance';
      default:          return 'payment';
    }
  }

  getMethodLabel(type: string): string {
    switch (type) {
      case 'jazzcash':  return 'JazzCash';
      case 'easypaisa': return 'Easypaisa';
      case 'bank':      return 'Bank';
      default:          return type;
    }
  }

  initials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }

  getTrustStyle(score: number) { return this.adminService.getTrustScoreStyle(score); }
  getUserStatusStyle(s: string) { return this.adminService.getUserStatusStyle(s); }
  getCommitteeStatusStyle(s: string) { return this.adminService.getCommitteeStatusStyle(s); }

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
