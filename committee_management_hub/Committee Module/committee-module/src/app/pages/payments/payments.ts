import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../shared/sidebar/sidebar';
import { TopnavComponent } from '../../shared/topnav/topnav';
import { PaymentService, PaymentCommittee, PaymentProof } from '../../core/payment.service';
import { AuthService } from '../../core/auth.service';
import { CommitteeCycleService } from '../../core/committee-cycle.service';
import { WinnerSelectionService } from '../../core/winner-selection.service';
import { CommitteeService } from '../../core/committee.service';

/** Winner payment details */
export interface WinnerPaymentInfo {
  winner_name: string;
  methods?: Array<{
    method_type: 'jazzcash' | 'easypaisa' | 'bank';
    account_number: string;
    account_title: string;
    bank_name?: string;
    iban?: string;
    is_primary: boolean;
  }>;
}

/** Enriched committee card with runtime state */
export interface PaymentCard {
  committee: PaymentCommittee;
  countdown: { label: string; urgency: 'safe' | 'warning' | 'danger' | 'overdue' | 'grace' | 'missed' };
  paymentStatus: 'on_time' | 'late' | 'missed' | 'pending';
  dueDate: string;
  monthYear: string;
  myProof: PaymentProof | null;
  showUploadModal: boolean;
  uploading: boolean;
  uploadError: string;
  showProofsPanel: boolean;
  proofs: PaymentProof[];
  loadingProofs: boolean;
  winnerPaymentInfo: WinnerPaymentInfo | null;
  showWinnerDetails: boolean;
  winnerUserId: string | null;   // The member who was selected (for isWinner check)
  leaderUserId: string | null;   // For shared groups: the leader's user_id (also a winner)
}

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopnavComponent],
  templateUrl: './payments.html',
  styleUrl: './payments.scss'
})
export class PaymentsComponent implements OnInit {
  cards    = signal<PaymentCard[]>([]);
  loading  = signal(true);
  errorMsg = signal('');

  currentUserId = computed(() => this.auth.user()?.id ?? '');

  constructor(
    private paymentService: PaymentService,
    private auth: AuthService,
    private cycleService: CommitteeCycleService,
    private winnerService: WinnerSelectionService,
    private committeeService: CommitteeService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.auth.ready;
    this.loading.set(true);

    const { data, error } = await this.paymentService.getPaymentCommittees();
    this.loading.set(false);

    if (error) { this.errorMsg.set(error); return; }

    const monthYear = this.paymentService.getCurrentMonthYear();

    // Build card state for each committee
    const cardList: PaymentCard[] = await Promise.all(
      data.map(async (c) => {
        const myProof = await this.paymentService.getMyProof(c.id, monthYear);
        
        // Get current winner from winner_selections table
        const { data: winnerSelection } = await this.winnerService.getCurrentWinner(c.id);
        
        // Get winner's payment details if winner exists
        let winnerPaymentInfo: WinnerPaymentInfo | null = null;
        let winnerUserId: string | null = null;
        let leaderUserId: string | null = null;
        
        if (winnerSelection) {
          console.log('🏆 Winner found:', winnerSelection.member_name, 'is_shared_group:', winnerSelection.is_shared_group);
          
          let paymentUserId: string | null = null;

          if (winnerSelection.is_shared_group && winnerSelection.payment_details_user_id) {
            // Shared group: always use the group leader's user_id for payment details
            paymentUserId = winnerSelection.payment_details_user_id;
            leaderUserId = winnerSelection.payment_details_user_id;
            console.log('👥 Shared group winner — using leader user_id for payment details:', paymentUserId);
            // Also get the selected member's user_id so both are treated as winners
            const { data: members } = await this.committeeService.getCommitteeMembers(c.id);
            const winnerMember = members?.find(m => m.id === winnerSelection.member_id);
            winnerUserId = winnerMember?.user_id ?? null;
          } else {
            // Single member: find their user_id from committee_members
            const { data: members } = await this.committeeService.getCommitteeMembers(c.id);
            const winnerMember = members?.find(m => m.id === winnerSelection.member_id);
            paymentUserId = winnerMember?.user_id ?? null;
            winnerUserId = paymentUserId;
            console.log('👤 Single winner member record:', winnerMember);
          }

          if (paymentUserId) {
            console.log('🔍 Fetching payment details for user_id:', paymentUserId);
            const { data: paymentDetails, error: paymentError } = await this.winnerService.getWinnerPaymentDetails(paymentUserId);
            console.log('💳 Payment details response:', { data: paymentDetails, error: paymentError });

            if (paymentDetails) {
              winnerPaymentInfo = {
                winner_name: winnerSelection.member_name,
                methods: paymentDetails.methods
              };
            } else {
              winnerPaymentInfo = { winner_name: winnerSelection.member_name };
            }
          } else {
            console.error('❌ Could not determine payment user_id for winner');
            winnerPaymentInfo = { winner_name: winnerSelection.member_name };
          }
        } else {
          console.log('ℹ️ No winner selected yet for committee:', c.name);
        }
        
        // Use real deadline if set, otherwise fall back to due_day
        const countdownResult = c.payment_deadline_date
          ? this.paymentService.getCountdownFromDeadline(
              c.payment_deadline_date,
              c.grace_period_days ?? 3,
              c.payment_cycle_days ?? 30,
              myProof?.status ?? null
            )
          : { label: this.paymentService.getCountdown(c.due_day).label,
              urgency: this.paymentService.getCountdown(c.due_day).urgency,
              paymentStatus: 'pending' as const,
              nextDeadline: null };

        // If payment accepted, show next deadline date; otherwise show current
        const displayDeadline = countdownResult.nextDeadline ?? c.payment_deadline_date;
        const dueDate = displayDeadline
          ? new Date(displayDeadline).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
          : this.paymentService.formatDueDate(c.due_day);

        return {
          committee: c,
          countdown: { label: countdownResult.label, urgency: countdownResult.urgency as any },
          paymentStatus: countdownResult.paymentStatus,
          dueDate,
          monthYear,
          myProof,
          showUploadModal: false,
          uploading: false,
          uploadError: '',
          showProofsPanel: false,
          proofs: [],
          loadingProofs: false,
          winnerPaymentInfo: winnerPaymentInfo,
          showWinnerDetails: false,
          winnerUserId: winnerUserId,
          leaderUserId: leaderUserId,
        };
      })
    );

    this.cards.set(cardList);
  }

  isAdmin(card: PaymentCard): boolean {
    return card.committee.created_by === this.currentUserId();
  }

  /**
   * Check if current user is the winner for this committee.
   * For shared groups, both the leader and the member are winners.
   */
  isWinner(card: PaymentCard): boolean {
    if (!card.winnerUserId) return false;
    // Direct match (single winner or shared group member who was selected)
    if (card.winnerUserId === this.currentUserId()) return true;
    // For shared groups, also check if current user is the leader (payment_details_user_id)
    if (card.leaderUserId && card.leaderUserId === this.currentUserId()) return true;
    return false;
  }

  // ── Upload flow ──────────────────────────────────────────────────────────

  openUpload(card: PaymentCard): void {
    this.updateCard(card, { showUploadModal: true, uploadError: '' });
  }

  closeUpload(card: PaymentCard): void {
    this.updateCard(card, { showUploadModal: false });
  }

  async onFileSelected(event: Event, card: PaymentCard): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;

    // Validate type
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      this.updateCard(card, { uploadError: 'Only JPG, PNG, or PDF files are allowed.' });
      return;
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.updateCard(card, { uploadError: 'File must be under 5MB.' });
      return;
    }

    this.updateCard(card, { uploading: true, uploadError: '' });

    const user = this.auth.user()!;

    // Upload to Supabase Storage
    const { url, error: uploadErr } = await this.paymentService.uploadProof(
      card.committee.id, file, card.monthYear
    );

    if (uploadErr) {
      this.updateCard(card, {
        uploading: false,
        uploadError: `Upload failed: ${uploadErr}. Please ensure the "payment-proofs" storage bucket exists in Supabase (Storage → New Bucket → name: payment-proofs, Public: Yes).`
      });
      return;
    }

    const fileUrl = url!;

    // Save proof record
    const proofData = {
      committee_id:   card.committee.id,
      uploader_id:    user.id,
      uploader_name:  user.user_metadata?.['full_name'] || user.email?.split('@')[0] || 'User',
      file_name:      file.name,
      file_type:      file.type.startsWith('image') ? 'image' : 'pdf',
      file_url:       fileUrl,
      month_year:     card.monthYear,
      status:         'submitted' as const,
    };

    const { error: saveErr } = await this.paymentService.saveProof(proofData);

    if (saveErr && !saveErr.includes('does not exist')) {
      // If table doesn't exist yet, store locally
    }

    // Update card with proof
    const proof: PaymentProof = { ...proofData, id: crypto.randomUUID(), created_at: new Date().toISOString() };
    this.updateCard(card, { myProof: proof, uploading: false, showUploadModal: false });

    // Reset input
    input.value = '';
  }

  // ── Admin proofs panel ───────────────────────────────────────────────────

  async toggleProofsPanel(card: PaymentCard): Promise<void> {
    if (card.showProofsPanel) {
      this.updateCard(card, { showProofsPanel: false });
      return;
    }

    this.updateCard(card, { showProofsPanel: true, loadingProofs: true });
    const { data } = await this.paymentService.getProofsForCommittee(card.committee.id, card.monthYear);
    this.updateCard(card, { proofs: data, loadingProofs: false });
  }

  async acceptProof(card: PaymentCard, proof: PaymentProof): Promise<void> {
    await this.paymentService.acceptProof(proof.id);
    this.updateProofStatus(card, proof.id, 'accepted');
  }

  async rejectProof(card: PaymentCard, proof: PaymentProof): Promise<void> {
    await this.paymentService.rejectProof(proof.id);
    this.updateProofStatus(card, proof.id, 'rejected');
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Immutably update a card in the signal */
  private updateCard(card: PaymentCard, patch: Partial<PaymentCard>): void {
    this.cards.update(list =>
      list.map(c => c.committee.id === card.committee.id ? { ...c, ...patch } : c)
    );
  }

  private updateProofStatus(card: PaymentCard, proofId: string, status: string): void {
    this.cards.update(list =>
      list.map(c => {
        if (c.committee.id !== card.committee.id) return c;
        return {
          ...c,
          proofs: c.proofs.map(p => p.id === proofId ? { ...p, status: status as any } : p)
        };
      })
    );
  }

  getUrgencyClasses(urgency: string): { bg: string; text: string; border: string; icon: string } {
    switch (urgency) {
      case 'safe':    return { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', icon: 'schedule' };
      case 'warning': return { bg: '#fef9c3', text: '#854d0e', border: '#fde68a', icon: 'warning' };
      case 'danger':  return { bg: '#ffdad6', text: '#ba1a1a', border: '#fca5a5', icon: 'alarm' };
      case 'grace':   return { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa', icon: 'hourglass_bottom' };
      case 'missed':  return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0', icon: 'event_busy' };
      case 'overdue': return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0', icon: 'event_busy' };
      default:        return { bg: '#f2f4f6', text: '#434655', border: '#c3c6d7', icon: 'schedule' };
    }
  }

  getPaymentStatusBadge(card: PaymentCard): { label: string; bg: string; text: string; icon: string } {
    if (card.myProof?.status === 'accepted') {
      return { label: 'Payment Accepted ✅', bg: '#d4edda', text: '#155724', icon: 'verified' };
    }
    if (card.myProof?.status === 'rejected') {
      return { label: 'Proof Rejected ❌', bg: '#ffdad6', text: '#ba1a1a', icon: 'cancel' };
    }
    if (card.myProof?.status === 'submitted') {
      if (card.paymentStatus === 'late') {
        return { label: 'Late Submission ⚠️', bg: '#fff7ed', text: '#c2410c', icon: 'schedule_send' };
      }
      return { label: 'Proof Submitted ✅', bg: '#dbe1ff', text: '#004ac6', icon: 'upload_file' };
    }
    if (card.paymentStatus === 'missed') {
      return { label: 'Missed Payment ❌', bg: '#f1f5f9', text: '#475569', icon: 'event_busy' };
    }
    return { label: 'Pending', bg: '#f2f4f6', text: '#434655', icon: 'pending' };
  }

  openFile(url: string): void {
    if (!url || url.startsWith('blob:')) {
      alert('This file link has expired. Please re-upload the payment proof.');
      return;
    }
    window.open(url, '_blank');
  }

  // ── Winner Details ───────────────────────────────────────────────────────

  toggleWinnerDetails(card: PaymentCard): void {
    this.updateCard(card, { showWinnerDetails: !card.showWinnerDetails });
  }

  hasWinnerPaymentDetails(card: PaymentCard): boolean {
    const info = card.winnerPaymentInfo;
    if (!info || !info.methods) return false;
    return info.methods.length > 0;
  }

  getMethodLabel(type: string): string {
    switch (type) {
      case 'jazzcash': return 'JazzCash';
      case 'easypaisa': return 'Easypaisa';
      case 'bank': return 'Bank Account';
      default: return type;
    }
  }

  getMethodIcon(type: string): string {
    switch (type) {
      case 'jazzcash': return 'phone_iphone';
      case 'easypaisa': return 'phone_android';
      case 'bank': return 'account_balance';
      default: return 'payment';
    }
  }

  async copyToClipboard(text: string, label: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      alert(`${label} copied to clipboard!`);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }
}
