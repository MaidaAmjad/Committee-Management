import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminSidebarComponent } from '../../../shared/admin-sidebar/admin-sidebar';
import { VerificationService, VerificationRequest } from '../../../core/verification.service';

@Component({
  selector: 'app-admin-verification',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSidebarComponent],
  templateUrl: './admin-verification.html',
})
export class AdminVerificationComponent implements OnInit {
  verifications = signal<VerificationRequest[]>([]);
  loading       = signal(true);
  errorMsg      = signal('');
  filterStatus  = signal<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  selectedItem  = signal<VerificationRequest | null>(null);
  rejectionReason = '';
  showRejectModal = signal(false);
  processing    = signal(false);

  filtered = computed(() => {
    const f = this.filterStatus();
    const all = this.verifications();
    return f === 'all' ? all : all.filter(v => v.status === f);
  });

  stats = computed(() => {
    const all = this.verifications();
    return {
      total:    all.length,
      pending:  all.filter(v => v.status === 'pending').length,
      approved: all.filter(v => v.status === 'approved').length,
      rejected: all.filter(v => v.status === 'rejected').length,
    };
  });

  constructor(private verificationService: VerificationService) {}

  async ngOnInit(): Promise<void> {
    await this.loadVerifications();
  }

  async loadVerifications(): Promise<void> {
    this.loading.set(true);
    const { data, error } = await this.verificationService.getAllVerifications();
    this.loading.set(false);
    if (error) { this.errorMsg.set(error); return; }
    this.verifications.set(data);
  }

  openDetail(item: VerificationRequest): void {
    this.selectedItem.set(item);
  }

  closeDetail(): void {
    this.selectedItem.set(null);
    this.showRejectModal.set(false);
    this.rejectionReason = '';
  }

  async approve(item: VerificationRequest): Promise<void> {
    this.processing.set(true);
    const { error } = await this.verificationService.approveVerification(item.id, item.user_id);
    this.processing.set(false);
    if (error) { this.errorMsg.set(error); return; }
    this.verifications.update(list =>
      list.map(v => v.id === item.id ? { ...v, status: 'approved' as const } : v)
    );
    this.selectedItem.update(v => v ? { ...v, status: 'approved' as const } : v);
  }

  openRejectModal(): void {
    this.showRejectModal.set(true);
  }

  async confirmReject(item: VerificationRequest): Promise<void> {
    if (!this.rejectionReason.trim()) return;
    this.processing.set(true);
    const { error } = await this.verificationService.rejectVerification(
      item.id, item.user_id, this.rejectionReason.trim()
    );
    this.processing.set(false);
    if (error) { this.errorMsg.set(error); return; }
    this.verifications.update(list =>
      list.map(v => v.id === item.id ? { ...v, status: 'rejected' as const, rejection_reason: this.rejectionReason } : v)
    );
    this.selectedItem.update(v => v ? { ...v, status: 'rejected' as const } : v);
    this.showRejectModal.set(false);
    this.rejectionReason = '';
  }

  getStatusStyle(status: string): { bg: string; color: string } {
    switch (status) {
      case 'pending':  return { bg: '#fef9c3', color: '#854d0e' };
      case 'approved': return { bg: '#d4edda', color: '#155724' };
      case 'rejected': return { bg: '#ffdad6', color: '#ba1a1a' };
      default:         return { bg: '#f2f4f6', color: '#434655' };
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'pending':  return 'hourglass_empty';
      case 'approved': return 'verified';
      case 'rejected': return 'cancel';
      default:         return 'help';
    }
  }

  initials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }

  openImage(url: string): void {
    window.open(url, '_blank');
  }
}
