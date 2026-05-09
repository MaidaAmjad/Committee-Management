import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WinnerSelectionService, EligibleMember, WinnerSelection } from '../../core/winner-selection.service';

/**
 * Winner Selection Component
 * Allows committee admin to select winners based on distribution method
 */
@Component({
  selector: 'app-winner-selection',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './winner-selection.html',
  styleUrl: './winner-selection.scss'
})
export class WinnerSelectionComponent implements OnInit {
  @Input() committeeId!: string;
  @Input() distributionMethod: 'random' | 'manual' = 'random';
  @Input() committeeName: string = '';
  @Output() winnerSelected = new EventEmitter<WinnerSelection>();

  eligibleMembers = signal<EligibleMember[]>([]);
  selectedMemberId = '';
  loading = signal(false);
  error = signal('');
  success = signal(false);

  constructor(private winnerService: WinnerSelectionService) {}

  async ngOnInit(): Promise<void> {
    await this.loadEligibleMembers();
  }

  /**
   * Load eligible members for selection
   */
  async loadEligibleMembers(): Promise<void> {
    const { data, error } = await this.winnerService.getEligibleMembers(this.committeeId);
    
    if (error) {
      this.error.set(error);
      return;
    }

    this.eligibleMembers.set(data);
  }

  /**
   * Handle random winner selection
   */
  async selectRandomWinner(): Promise<void> {
    if (this.eligibleMembers().length === 0) {
      this.error.set('No eligible members available for selection');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.success.set(false);

    const { data, error } = await this.winnerService.selectRandomWinner(this.committeeId);

    this.loading.set(false);

    if (error) {
      this.error.set(error);
      return;
    }

    if (data) {
      this.success.set(true);
      
      // Send announcement
      await this.winnerService.sendWinnerAnnouncement(
        this.committeeId,
        data.member_name,
        data.cycle_number,
        'random'
      );

      this.winnerSelected.emit(data);
      
      // Reload eligible members
      await this.loadEligibleMembers();
    }
  }

  /**
   * Handle manual winner selection
   */
  async selectManualWinner(): Promise<void> {
    if (!this.selectedMemberId) {
      this.error.set('Please select a member');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.success.set(false);

    const { data, error } = await this.winnerService.selectManualWinner(
      this.committeeId,
      this.selectedMemberId
    );

    this.loading.set(false);

    if (error) {
      this.error.set(error);
      return;
    }

    if (data) {
      this.success.set(true);
      
      // Send announcement
      await this.winnerService.sendWinnerAnnouncement(
        this.committeeId,
        data.member_name,
        data.cycle_number,
        'manual'
      );

      this.winnerSelected.emit(data);
      
      // Reset selection and reload
      this.selectedMemberId = '';
      await this.loadEligibleMembers();
    }
  }

  /**
   * Get member display name with slot type
   */
  getMemberDisplay(member: EligibleMember): string {
    const slotBadge = member.slot_type === 'shared' ? ' (Shared)' : '';
    return `${member.full_name}${slotBadge}`;
  }
}
