import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WinnerSelectionService, WinnerPaymentDetails } from '../../core/winner-selection.service';

/**
 * Winner Payment Details Component
 * Displays payment information for the selected winner
 */
@Component({
  selector: 'app-winner-payment-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './winner-payment-details.html',
  styleUrl: './winner-payment-details.scss'
})
export class WinnerPaymentDetailsComponent implements OnInit {
  @Input() userId!: string;
  @Input() winnerName: string = '';
  @Input() cycleNumber: number = 1;

  paymentDetails = signal<WinnerPaymentDetails | null>(null);
  loading = signal(true);
  error = signal('');

  constructor(private winnerService: WinnerSelectionService) {}

  async ngOnInit(): Promise<void> {
    await this.loadPaymentDetails();
  }

  /**
   * Load payment details for the winner
   */
  async loadPaymentDetails(): Promise<void> {
    this.loading.set(true);
    this.error.set('');

    const { data, error } = await this.winnerService.getWinnerPaymentDetails(this.userId);

    this.loading.set(false);

    if (error) {
      this.error.set(error);
      return;
    }

    this.paymentDetails.set(data);
  }

  /**
   * Get primary method display name
   */
  getPrimaryMethodName(): string {
    const method = this.paymentDetails()?.primary_method;
    if (!method) return 'Not Set';
    
    switch (method) {
      case 'jazzcash': return 'JazzCash';
      case 'easypaisa': return 'Easypaisa';
      case 'bank': return 'Bank Transfer';
      default: return 'Not Set';
    }
  }

  /**
   * Get primary method icon
   */
  getPrimaryMethodIcon(): string {
    const method = this.paymentDetails()?.primary_method;
    if (!method) return 'payment';
    
    switch (method) {
      case 'jazzcash': return 'phone_android';
      case 'easypaisa': return 'phone_android';
      case 'bank': return 'account_balance';
      default: return 'payment';
    }
  }

  /**
   * Check if payment details are available
   */
  hasPaymentDetails(): boolean {
    const details = this.paymentDetails();
    if (!details) return false;
    
    return !!(
      details.jazzcash_number ||
      details.easypaisa_number ||
      details.bank_account_number
    );
  }

  /**
   * Copy text to clipboard
   */
  async copyToClipboard(text: string, label: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      // You can add a toast notification here
      console.log(`${label} copied to clipboard`);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }
}
