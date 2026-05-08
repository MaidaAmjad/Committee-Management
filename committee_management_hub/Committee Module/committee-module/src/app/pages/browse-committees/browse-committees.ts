import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SidebarComponent } from '../../shared/sidebar/sidebar';
import { TopnavComponent } from '../../shared/topnav/topnav';
import { CommitteeService, Committee } from '../../core/committee.service';
import { AuthService } from '../../core/auth.service';

// Per-card request state
interface RequestState { requested: boolean; status: string | null; }

@Component({
  selector: 'app-browse-committees',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidebarComponent, TopnavComponent],
  templateUrl: './browse-committees.html',
  styleUrl: './browse-committees.scss'
})
export class BrowseCommitteesComponent implements OnInit {

  allCommittees  = signal<Committee[]>([]);
  requestStates  = signal<Record<string, RequestState>>({});
  joiningId      = signal<string | null>(null);
  loading        = signal(true);
  errorMsg       = signal('');
  searchQuery    = signal('');
  maxAmount      = signal(10000);
  amountFilter   = signal(10000);

  currentUserId = computed(() => this.auth.user()?.id ?? '');

  filteredCommittees = computed(() => {
    const q      = this.searchQuery().toLowerCase().trim();
    const maxAmt = this.amountFilter();
    return this.allCommittees().filter(c =>
      (!q || c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)) &&
      c.monthly_amount <= maxAmt
    );
  });

  constructor(
    private committeeService: CommitteeService,
    private auth: AuthService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    await this.auth.ready;
    this.loading.set(true);

    // Run both queries in parallel — one for committees, one for user's memberships
    const [committeesRes, membershipMap] = await Promise.all([
      this.committeeService.getAllCommittees(),
      this.committeeService.getMyMembershipStatuses(),
    ]);

    this.loading.set(false);

    if (committeesRes.error) { this.errorMsg.set(committeesRes.error); return; }

    this.allCommittees.set(committeesRes.data);

    // Build request states from the single membership query
    const states: Record<string, RequestState> = {};
    committeesRes.data.forEach(c => {
      const status = membershipMap[c.id] ?? null;
      states[c.id] = { requested: !!status, status };
    });
    this.requestStates.set(states);

    if (committeesRes.data.length) {
      const max = Math.max(...committeesRes.data.map(c => c.monthly_amount));
      this.maxAmount.set(max > 0 ? max : 10000);
      this.amountFilter.set(max > 0 ? max : 10000);
    }
  }

  isOwner(c: Committee): boolean {
    return c.created_by === this.currentUserId();
  }

  getRequestState(c: Committee): RequestState {
    return this.requestStates()[c.id] ?? { requested: false, status: null };
  }

  async joinCommittee(c: Committee, event: Event): Promise<void> {
    event.stopPropagation();
    this.joiningId.set(c.id);
    const { error } = await this.committeeService.joinCommittee(c.id);
    this.joiningId.set(null);
    if (error) { this.errorMsg.set(error); return; }
    // Mark as pending
    this.requestStates.update(s => ({ ...s, [c.id]: { requested: true, status: 'pending' } }));
  }

  viewDetails(c: Committee): void {
    this.router.navigate(['/committee', c.id]);
  }

  getSlotsLeft(c: Committee): number { return c.max_members; }

  getSlotLabel(c: Committee): string {
    const s = this.getSlotsLeft(c);
    return s <= 2 ? `${s} SLOTS LEFT` : `${s} SLOTS OPEN`;
  }

  getSlotStyle(c: Committee): { bg: string; color: string } {
    const s = this.getSlotsLeft(c);
    if (s <= 2) return { bg: '#ffdbcd', color: '#7d2d00' };
    if (s <= 5) return { bg: '#fef9c3', color: '#854d0e' };
    return { bg: '#d0e1fb', color: '#54647a' };
  }

  getStatusBadge(c: Committee): { bg: string; color: string } {
    return c.status === 'Active'
      ? { bg: '#f0fdf4', color: '#15803d' }
      : { bg: '#eff6ff', color: '#1d4ed8' };
  }

  goToCreate(): void { this.router.navigate(['/create-committee']); }
  onSearch(v: string): void { this.searchQuery.set(v); }
  onAmountChange(v: number): void { this.amountFilter.set(v); }
  resetFilters(): void { this.searchQuery.set(''); this.amountFilter.set(this.maxAmount()); }
}
