import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SidebarComponent } from '../../shared/sidebar/sidebar';
import { TopnavComponent } from '../../shared/topnav/topnav';
import { CommitteeService, Committee } from '../../core/committee.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-my-committees',
  standalone: true,
  imports: [CommonModule, SidebarComponent, TopnavComponent],
  templateUrl: './my-committees.html',
  styleUrl: './my-committees.scss'
})
export class MyCommitteesComponent implements OnInit {
  activeTab: 'Active' | 'Past' = 'Active';

  leadCommittees   = signal<Committee[]>([]);
  joinedCommittees = signal<Committee[]>([]);
  loading          = signal(true);
  errorMsg         = signal('');

  constructor(
    private committeeService: CommitteeService,
    private auth: AuthService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    await this.auth.ready;
    this.loading.set(true);
    this.errorMsg.set('');

    const [leadRes, joinedRes] = await Promise.all([
      this.committeeService.getMyCommittees(),
      this.committeeService.getJoinedCommittees(),
    ]);

    this.loading.set(false);

    if (leadRes.error)   this.errorMsg.set(leadRes.error);
    if (joinedRes.error) this.errorMsg.set(joinedRes.error);

    this.leadCommittees.set(leadRes.data);
    this.joinedCommittees.set(joinedRes.data);
  }

  getStatusStyle(status: string): { bg: string; color: string; border: string } {
    switch (status) {
      case 'Active':     return { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' };
      case 'Recruiting': return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
      case 'Completed':  return { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' };
      default:           return { bg: '#f2f4f6', color: '#434655', border: '#c3c6d7' };
    }
  }

  formatAmount(amount: number): string {
    return `$${amount.toLocaleString()}.00`;
  }

  viewDetails(id: string): void {
    this.router.navigate(['/committee', id]);
  }

  goToCreate(): void {
    this.router.navigate(['/create-committee']);
  }

  goToBrowse(): void {
    this.router.navigate(['/browse']);
  }
}
