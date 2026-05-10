import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SidebarComponent } from '../../shared/sidebar/sidebar';
import { TopnavComponent } from '../../shared/topnav/topnav';
import { CommitteeService, Committee, CommitteeMember } from '../../core/committee.service';
import { AuthService } from '../../core/auth.service';
import { WinnerSelectionComponent } from '../../shared/winner-selection/winner-selection';
import { WinnerPaymentDetailsComponent } from '../../shared/winner-payment-details/winner-payment-details';
import { CommitteeAnnouncementComponent } from '../../shared/committee-announcement/committee-announcement';
import { WinnerSelectionService, WinnerSelection } from '../../core/winner-selection.service';

@Component({
  selector: 'app-committee-detail',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterLink, 
    SidebarComponent, 
    TopnavComponent,
    WinnerSelectionComponent,
    WinnerPaymentDetailsComponent,
    CommitteeAnnouncementComponent
  ],
  templateUrl: './committee-detail.html',
  styleUrl: './committee-detail.scss'
})
export class CommitteeDetailComponent implements OnInit {
  committee     = signal<Committee | null>(null);
  members       = signal<CommitteeMember[]>([]);
  broadcasts    = signal<any[]>([]);
  loading       = signal(true);
  joining       = signal(false);
  leaving       = signal(false);
  requestStatus = signal<string | null>(null);
  errorMsg      = signal('');
  successMsg    = signal('');

  // Winner selection
  currentWinner = signal<WinnerSelection | null>(null);
  showWinnerSelection = signal(false);
  selectingWinner = signal(false);
  showWinnerModal = signal(false);
  selectedWinnerName = signal('');

  // Committee completion
  showCompletionModal = signal(false);

  // Broadcast
  broadcastText    = '';
  sendingBroadcast = signal(false);
  broadcastError   = signal('');
  broadcastSuccess = signal('');

  currentUserId = computed(() => this.auth.user()?.id ?? '');
  isOwner       = computed(() => this.committee()?.created_by === this.currentUserId());
  isMember      = computed(() => this.requestStatus() === 'approved');

  // Only count approved members for slots
  approvedMembers = computed(() => this.members().filter(m => m.status === 'approved'));

  slotsLeft = computed(() => {
    const c = this.committee();
    if (!c) return 0;
    return Math.max(0, c.max_members - this.approvedMembers().length);
  });

  totalPool = computed(() => {
    const c = this.committee();
    if (!c) return 0;
    return c.monthly_amount * c.max_members * c.duration_months;
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private committeeService: CommitteeService,
    private winnerService: WinnerSelectionService,
    public auth: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigate(['/browse']); return; }

    await this.auth.ready;
    this.loading.set(true);

    const [committeeRes, membersRes, reqState, broadcastsRes] = await Promise.all([
      this.committeeService.getCommitteeById(id),
      this.committeeService.getCommitteeMembers(id),
      this.committeeService.hasRequested(id),
      this.committeeService.getBroadcasts(id),
    ]);

    this.loading.set(false);

    if (committeeRes.error || !committeeRes.data) {
      this.errorMsg.set(committeeRes.error ?? 'Committee not found');
      return;
    }

    this.committee.set(committeeRes.data);
    this.members.set(membersRes.data);
    this.broadcasts.set(broadcastsRes.data);
    // Set the real status: null if no request, otherwise 'pending'/'approved'/'rejected'
    this.requestStatus.set(reqState.requested ? reqState.status : null);

    // Load current winner
    await this.loadCurrentWinner();
  }

  async loadCurrentWinner(): Promise<void> {
    const c = this.committee();
    if (!c) return;

    const { data } = await this.winnerService.getCurrentWinner(c.id);
    this.currentWinner.set(data);

    // If committee is already complete, show the completion modal
    const isComplete = await this.winnerService.isCommitteeComplete(c.id);
    if (isComplete && data) {
      // Only show if committee status isn't already marked completed
      // (avoid showing on every page load after completion)
      if (c.status !== 'Completed') {
        this.showCompletionModal.set(true);
      }
    }
  }

  async join(): Promise<void> {
    const c = this.committee();
    if (!c) return;
    this.joining.set(true);
    this.errorMsg.set('');

    const { error } = await this.committeeService.joinCommittee(c.id);
    this.joining.set(false);

    if (error) { this.errorMsg.set(error); return; }

    this.requestStatus.set('pending');
    this.successMsg.set('Join request sent! Waiting for the committee owner to approve.');
    // Refresh members list
    const { data } = await this.committeeService.getCommitteeMembers(c.id);
    this.members.set(data);
    setTimeout(() => this.successMsg.set(''), 4000);
  }

  async leave(): Promise<void> {
    const c = this.committee();
    if (!c) return;
    this.leaving.set(true);
    this.errorMsg.set('');

    const { error } = await this.committeeService.leaveCommittee(c.id);
    this.leaving.set(false);

    if (error) { this.errorMsg.set(error); return; }

    this.requestStatus.set(null);
    const { data } = await this.committeeService.getCommitteeMembers(c.id);
    this.members.set(data);
  }

  async sendBroadcast(): Promise<void> {
    const c = this.committee();
    if (!c || !this.broadcastText.trim()) return;

    this.sendingBroadcast.set(true);
    this.broadcastError.set('');

    const { error } = await this.committeeService.sendBroadcast(c.id, this.broadcastText.trim());
    this.sendingBroadcast.set(false);

    if (error) { this.broadcastError.set(error); return; }

    this.broadcastSuccess.set('Message sent to all members!');
    this.broadcastText = '';

    // Refresh broadcasts
    const { data } = await this.committeeService.getBroadcasts(c.id);
    this.broadcasts.set(data);
    setTimeout(() => this.broadcastSuccess.set(''), 3000);
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getProgressWidth(): string {
    const c = this.committee();
    if (!c || c.max_members === 0) return '0%';
    return `${Math.min(100, (this.approvedMembers().length / c.max_members) * 100)}%`;
  }

  /**
   * Handle winner selection
   */
  async onWinnerSelected(winner: WinnerSelection): Promise<void> {
    this.currentWinner.set(winner);
    this.showWinnerSelection.set(false);
    this.successMsg.set(`Winner selected: ${winner.member_name}`);
    setTimeout(() => this.successMsg.set(''), 4000);
    
    // Refresh broadcasts to show announcement
    const c = this.committee();
    if (c) {
      const { data } = await this.committeeService.getBroadcasts(c.id);
      this.broadcasts.set(data);
    }
  }

  /**
   * Get distribution method display text
   */
  getDistributionMethodDisplay(): string {
    const method = this.committee()?.distribution_method;
    return method === 'random' ? 'Random Selection' : 'Manual Selection';
  }

  /**
   * Get winner's user ID for payment details
   */
  getWinnerUserId(): string | null {
    const winner = this.currentWinner();
    if (!winner) return null;
    
    const member = this.members().find(m => m.id === winner.member_id);
    return member?.user_id || null;
  }

  /**
   * Select yourself (admin) as winner
   */
  async selectYourselfAsWinner(): Promise<void> {
    const c = this.committee();
    if (!c) return;

    const adminMember = this.members().find(m => m.user_id === this.currentUserId() && m.status === 'approved');
    if (!adminMember) {
      this.errorMsg.set('You must be an approved member to select yourself as winner');
      setTimeout(() => this.errorMsg.set(''), 4000);
      return;
    }

    this.selectingWinner.set(true);
    this.errorMsg.set('');

    const { data, error } = await this.winnerService.selectManualWinner(c.id, adminMember.id);

    this.selectingWinner.set(false);

    if (error) {
      this.errorMsg.set(error);
      setTimeout(() => this.errorMsg.set(''), 4000);
      return;
    }

    if (data) {
      this.currentWinner.set(data);
      
      // Show winner modal
      this.selectedWinnerName.set(data.member_name);
      this.showWinnerModal.set(true);
      console.log('Winner modal should show:', data.member_name);
      
      // Send announcement
      await this.winnerService.sendWinnerAnnouncement(c.id, data.member_name, data.cycle_number, 'manual');

      // Refresh broadcasts
      const { data: broadcastData } = await this.committeeService.getBroadcasts(c.id);
      this.broadcasts.set(broadcastData);

      // Check if committee is now complete (all members have won)
      await this.checkAndHandleCompletion(c.id);
    }
  }

  /**
   * Select random member as winner
   */
  async selectRandomWinner(): Promise<void> {
    const c = this.committee();
    if (!c) return;

    const approved = this.approvedMembers();
    if (approved.length < 2) {
      this.errorMsg.set('Need at least 2 approved members for random selection');
      setTimeout(() => this.errorMsg.set(''), 4000);
      return;
    }

    this.selectingWinner.set(true);
    this.errorMsg.set('');

    const { data, error } = await this.winnerService.selectRandomWinner(c.id);

    this.selectingWinner.set(false);

    if (error) {
      // If no eligible members, the committee is complete — show completion popup
      if (error.includes('No eligible members')) {
        await this.checkAndHandleCompletion(c.id);
        return;
      }
      this.errorMsg.set(error);
      setTimeout(() => this.errorMsg.set(''), 4000);
      return;
    }

    if (data) {
      this.currentWinner.set(data);
      
      // Show winner modal
      this.selectedWinnerName.set(data.member_name);
      this.showWinnerModal.set(true);
      
      // Send announcement
      await this.winnerService.sendWinnerAnnouncement(c.id, data.member_name, data.cycle_number, 'random');

      // Refresh broadcasts
      const { data: broadcastData } = await this.committeeService.getBroadcasts(c.id);
      this.broadcasts.set(broadcastData);

      // Check if committee is now complete (all members have won)
      await this.checkAndHandleCompletion(c.id);
    }
  }

  /**
   * Close winner modal
   */
  closeWinnerModal(): void {
    this.showWinnerModal.set(false);
  }

  /**
   * Close committee completion modal
   */
  closeCompletionModal(): void {
    this.showCompletionModal.set(false);
  }

  /**
   * After a winner is selected, check if committee is now complete
   * (no eligible members left). If so, mark complete and show popup.
   */
  private async checkAndHandleCompletion(committeeId: string): Promise<void> {
    const c = this.committee();
    if (!c) return;

    const isComplete = await this.winnerService.isCommitteeComplete(committeeId);
    if (!isComplete) return;

    console.log('🎊 Committee is complete! All members have won.');

    // Send notification + update status
    await this.winnerService.completeCommittee(committeeId, c.name);

    // Refresh broadcasts so the completion message appears
    const { data: broadcastData } = await this.committeeService.getBroadcasts(committeeId);
    this.broadcasts.set(broadcastData);

    // Close winner modal and show completion popup
    this.showWinnerModal.set(false);
    this.showCompletionModal.set(true);
  }
}
