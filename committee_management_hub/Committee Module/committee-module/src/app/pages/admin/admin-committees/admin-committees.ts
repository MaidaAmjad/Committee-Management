import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminSidebarComponent } from '../../../shared/admin-sidebar/admin-sidebar';
import {  } from '../../../shared/admin-setup-banner/admin-setup-banner';
import { AdminService, AdminCommittee } from '../../../core/admin.service';
import { CommitteeMember } from '../../../core/committee.service';

@Component({
  selector: 'app-admin-committees',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSidebarComponent],
  templateUrl: './admin-committees.html',
})
export class AdminCommitteesComponent implements OnInit {
  allCommittees   = signal<AdminCommittee[]>([]);
  loading         = signal(true);
  errorMsg        = signal('');
  searchQuery     = signal('');
  statusFilter    = signal<'all' | 'Active' | 'Recruiting' | 'Completed'>('all');

  selectedCommittee = signal<AdminCommittee | null>(null);
  committeeMembers  = signal<CommitteeMember[]>([]);
  loadingMembers    = signal(false);

  confirmCloseCommittee  = signal<AdminCommittee | null>(null);
  confirmDeleteCommittee = signal<AdminCommittee | null>(null);
  confirmRemoveMember    = signal<CommitteeMember | null>(null);

  filteredCommittees = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const s = this.statusFilter();
    return this.allCommittees().filter(c =>
      (s === 'all' || c.status === s) &&
      (!q || c.name.toLowerCase().includes(q) || c.creator_name.toLowerCase().includes(q))
    );
  });

  constructor(private adminService: AdminService) {}

  async ngOnInit(): Promise<void> {
    await this.loadCommittees();
  }

  async loadCommittees(): Promise<void> {
    this.loading.set(true);
    const { data, error } = await this.adminService.getAllCommittees();
    this.loading.set(false);
    if (error) { this.errorMsg.set(error); return; }
    this.allCommittees.set(data);
  }

  async openDetail(c: AdminCommittee): Promise<void> {
    this.selectedCommittee.set(c);
    this.loadingMembers.set(true);
    const { data } = await this.adminService.getCommitteeMembers(c.id);
    this.committeeMembers.set(data);
    this.loadingMembers.set(false);
  }

  closeDetail(): void {
    this.selectedCommittee.set(null);
    this.committeeMembers.set([]);
  }

  async confirmClose(): Promise<void> {
    const c = this.confirmCloseCommittee();
    if (!c) return;
    const { error } = await this.adminService.closeCommittee(c.id);
    if (error) { this.errorMsg.set(error); return; }
    this.allCommittees.update(list => list.map(x => x.id === c.id ? { ...x, status: 'Completed' } : x));
    if (this.selectedCommittee()?.id === c.id) this.selectedCommittee.update(x => x ? { ...x, status: 'Completed' } : x);
    this.confirmCloseCommittee.set(null);
  }

  async confirmDelete(): Promise<void> {
    const c = this.confirmDeleteCommittee();
    if (!c) return;
    const { error } = await this.adminService.deleteCommittee(c.id);
    if (error) { this.errorMsg.set(error); return; }
    this.allCommittees.update(list => list.filter(x => x.id !== c.id));
    this.confirmDeleteCommittee.set(null);
    if (this.selectedCommittee()?.id === c.id) this.closeDetail();
  }

  async confirmRemove(): Promise<void> {
    const member = this.confirmRemoveMember();
    const committee = this.selectedCommittee();
    if (!member || !committee) return;
    const { error } = await this.adminService.removeMember(committee.id, member.id);
    if (error) { this.errorMsg.set(error); return; }
    this.committeeMembers.update(list => list.filter(m => m.id !== member.id));
    this.allCommittees.update(list => list.map(c => c.id === committee.id ? { ...c, member_count: Math.max(0, c.member_count - 1) } : c));
    this.confirmRemoveMember.set(null);
  }

  formatCurrency(n: number): string { return this.adminService.formatCurrency(n); }
  getCommitteeStatusStyle(s: string) { return this.adminService.getCommitteeStatusStyle(s); }

  get stats() {
    const cs = this.allCommittees();
    return {
      total:     cs.length,
      active:    cs.filter(c => c.status === 'Active').length,
      recruiting:cs.filter(c => c.status === 'Recruiting').length,
      completed: cs.filter(c => c.status === 'Completed').length,
      capital:   cs.reduce((s, c) => s + c.total_pool, 0),
    };
  }
}
