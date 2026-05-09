import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SidebarComponent } from '../../shared/sidebar/sidebar';
import { TopnavComponent } from '../../shared/topnav/topnav';
import { WinnerSelectionComponent } from '../../shared/winner-selection/winner-selection';
import { WinnerPaymentDetailsComponent } from '../../shared/winner-payment-details/winner-payment-details';
import { CommitteeAnnouncementComponent } from '../../shared/committee-announcement/committee-announcement';
import { CommitteeService, Committee } from '../../core/committee.service';
import { WinnerSelectionService, WinnerSelection } from '../../core/winner-selection.service';
import { AuthService } from '../../core/auth.service';

/**
 * Winner Management Page
 * Comprehensive page for committee admins to manage winner selection
 */
@Component({
  selector: 'app-winner-management',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    SidebarComponent,
    TopnavComponent,
    WinnerSelectionComponent,
    WinnerPaymentDetailsComponent,
    CommitteeAnnouncementComponent
  ],
  templateUrl: './winner-management.html',
  styleUrl: './winner-management.scss'
})
export class WinnerManagementComponent implements OnInit {
  committee = signal<Committee | null>(null);
  currentWinner = signal<WinnerSelection | null>(null);
  loading = signal(true);
  error = signal('');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private committeeService: CommitteeService,
    private winnerService: WinnerSelectionService,
    private auth: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/my-committees']);
      return;
    }

    await this.auth.ready;
    this.loading.set(true);

    // Load committee
    const { data: committee, error: committeeError } = await this.committeeService.getCommitteeById(id);
    
    if (committeeError || !committee) {
      this.error.set(committeeError || 'Committee not found');
      this.loading.set(false);
      return;
    }

    // Verify user is the owner
    const currentUser = this.auth.user();
    if (!currentUser || committee.created_by !== currentUser.id) {
      this.error.set('You do not have permission to manage winners for this committee');
      this.loading.set(false);
      return;
    }

    this.committee.set(committee);

    // Load current winner
    const { data: winner } = await this.winnerService.getCurrentWinner(id);
    this.currentWinner.set(winner);

    this.loading.set(false);
  }

  /**
   * Handle winner selection
   */
  async onWinnerSelected(winner: WinnerSelection): Promise<void> {
    this.currentWinner.set(winner);
  }

  /**
   * Get winner's user ID for payment details
   */
  getWinnerUserId(): string | null {
    const winner = this.currentWinner();
    if (!winner) return null;
    
    // In a real implementation, you would fetch the member details
    // For now, we'll need to store user_id in winner selection
    return null;
  }

  /**
   * Get distribution method display
   */
  getDistributionMethodDisplay(): string {
    const method = this.committee()?.distribution_method;
    return method === 'random' ? 'Random Selection' : 'Manual Selection';
  }

  /**
   * Get distribution method icon
   */
  getDistributionMethodIcon(): string {
    const method = this.committee()?.distribution_method;
    return method === 'random' ? 'shuffle' : 'touch_app';
  }
}
