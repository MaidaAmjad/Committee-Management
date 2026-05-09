import { Component, Input, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommitteeCycleService, CurrentCycleInfo, NextWinner } from '../../core/committee-cycle.service';
import { WinnerPaymentDetailsComponent } from '../winner-payment-details/winner-payment-details';
import { interval, Subscription } from 'rxjs';

/**
 * Cycle Countdown Component
 * Displays current cycle winner, countdown, and next winner info
 */
@Component({
  selector: 'app-cycle-countdown',
  standalone: true,
  imports: [CommonModule, WinnerPaymentDetailsComponent],
  templateUrl: './cycle-countdown.html',
  styleUrl: './cycle-countdown.scss'
})
export class CycleCountdownComponent implements OnInit, OnDestroy {
  @Input() committeeId!: string;
  @Input() committeeName: string = '';
  @Input() showPaymentDetails: boolean = true;

  currentCycle = signal<CurrentCycleInfo | null>(null);
  nextWinner = signal<NextWinner | null>(null);
  loading = signal(true);
  error = signal('');
  
  daysRemaining = signal(0);
  countdownText = signal('');
  
  private countdownSubscription?: Subscription;

  constructor(private cycleService: CommitteeCycleService) {}

  async ngOnInit(): Promise<void> {
    await this.loadCycleInfo();
    this.startCountdown();
  }

  ngOnDestroy(): void {
    this.countdownSubscription?.unsubscribe();
  }

  /**
   * Load current cycle and next winner info
   */
  async loadCycleInfo(): Promise<void> {
    this.loading.set(true);
    this.error.set('');

    // Load current cycle
    const { data: cycle, error: cycleError } = await this.cycleService.getCurrentCycleInfo(this.committeeId);
    
    if (cycleError) {
      this.error.set(cycleError);
      this.loading.set(false);
      return;
    }

    this.currentCycle.set(cycle);

    if (cycle) {
      this.daysRemaining.set(cycle.days_remaining);
      this.updateCountdownText(cycle.days_remaining);
    }

    // Load next winner
    const { data: next } = await this.cycleService.getNextWinner(this.committeeId);
    this.nextWinner.set(next);

    this.loading.set(false);
  }

  /**
   * Start countdown timer
   */
  startCountdown(): void {
    // Update countdown every hour
    this.countdownSubscription = interval(3600000).subscribe(() => {
      const cycle = this.currentCycle();
      if (cycle) {
        const days = this.cycleService.calculateDaysRemaining(cycle.end_date);
        this.daysRemaining.set(days);
        this.updateCountdownText(days);
      }
    });
  }

  /**
   * Update countdown text
   */
  updateCountdownText(days: number): void {
    this.countdownText.set(this.cycleService.formatCountdown(days));
  }

  /**
   * Get progress percentage
   */
  getProgressPercentage(): number {
    const cycle = this.currentCycle();
    if (!cycle) return 0;

    const start = new Date(cycle.start_date).getTime();
    const end = new Date(cycle.end_date).getTime();
    const now = new Date().getTime();

    const total = end - start;
    const elapsed = now - start;

    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  }

  /**
   * Get countdown color class
   */
  getCountdownColorClass(): string {
    const days = this.daysRemaining();
    if (days <= 3) return 'text-[#ba1a1a]'; // Red
    if (days <= 7) return 'text-[#f59e0b]'; // Amber
    return 'text-[#16a34a]'; // Green
  }

  /**
   * Get countdown background class
   */
  getCountdownBgClass(): string {
    const days = this.daysRemaining();
    if (days <= 3) return 'bg-[#ffdad6] border-[#ba1a1a]'; // Red
    if (days <= 7) return 'bg-[#fef3c7] border-[#f59e0b]'; // Amber
    return 'bg-[#d4edda] border-[#16a34a]'; // Green
  }

  /**
   * Format date
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }

  /**
   * Refresh cycle info
   */
  async refresh(): Promise<void> {
    await this.loadCycleInfo();
  }
}
