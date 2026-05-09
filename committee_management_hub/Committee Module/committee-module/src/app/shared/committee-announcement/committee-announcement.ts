import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WinnerSelectionService, WinnerSelection } from '../../core/winner-selection.service';

/**
 * Committee Announcement Component
 * Displays winner announcements and history
 */
@Component({
  selector: 'app-committee-announcement',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './committee-announcement.html',
  styleUrl: './committee-announcement.scss'
})
export class CommitteeAnnouncementComponent implements OnInit {
  @Input() committeeId!: string;
  @Input() showHistory: boolean = true;

  currentWinner = signal<WinnerSelection | null>(null);
  allWinners = signal<WinnerSelection[]>([]);
  loading = signal(true);
  error = signal('');

  constructor(private winnerService: WinnerSelectionService) {}

  async ngOnInit(): Promise<void> {
    await this.loadWinners();
  }

  /**
   * Load current and all winners
   */
  async loadWinners(): Promise<void> {
    this.loading.set(true);
    this.error.set('');

    // Load current winner
    const { data: current, error: currentError } = await this.winnerService.getCurrentWinner(this.committeeId);
    
    if (currentError) {
      this.error.set(currentError);
      this.loading.set(false);
      return;
    }

    this.currentWinner.set(current);

    // Load all winners if history is enabled
    if (this.showHistory) {
      const { data: all, error: allError } = await this.winnerService.getAllWinners(this.committeeId);
      
      if (allError) {
        console.warn('Failed to load winner history:', allError);
      } else {
        this.allWinners.set(all);
      }
    }

    this.loading.set(false);
  }

  /**
   * Get selection method display text
   */
  getMethodDisplay(method: 'random' | 'manual'): string {
    return method === 'random' ? 'Random Selection' : 'Manual Selection';
  }

  /**
   * Get method icon
   */
  getMethodIcon(method: 'random' | 'manual'): string {
    return method === 'random' ? 'shuffle' : 'touch_app';
  }

  /**
   * Format date
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Refresh winners
   */
  async refresh(): Promise<void> {
    await this.loadWinners();
  }
}
