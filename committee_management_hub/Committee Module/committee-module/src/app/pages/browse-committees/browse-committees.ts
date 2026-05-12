import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { SidebarComponent } from '../../shared/sidebar/sidebar';
import { TopnavComponent } from '../../shared/topnav/topnav';
import { CommitteeService, Committee } from '../../core/committee.service';
import { AuthService } from '../../core/auth.service';
import { GuestGuardService } from '../../core/guest-guard.service';
import { SignInPopupComponent } from '../../shared/sign-in-popup/sign-in-popup';

// Per-card request state
interface RequestState { requested: boolean; status: string | null; }

@Component({
  selector: 'app-browse-committees',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidebarComponent, TopnavComponent, SignInPopupComponent],
  templateUrl: './browse-committees.html',
  styleUrl: './browse-committees.scss'
})
export class BrowseCommitteesComponent implements OnInit, OnDestroy {

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

  private routerSub?: Subscription;

  isGuest = computed(() => !this.auth.user());

  constructor(
    private committeeService: CommitteeService,
    private auth: AuthService,
    private router: Router,
    public guestGuard: GuestGuardService
  ) {}

  async ngOnInit(): Promise<void> {
    // Load on first visit
    await this.loadData();

    // Reload every time the user navigates back to /browse
    this.routerSub = this.router.events.pipe(
      filter(e => e instanceof NavigationEnd && e.urlAfterRedirects.startsWith('/browse'))
    ).subscribe(() => this.loadData());
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  private async loadData(): Promise<void> {
    // For guests, don't wait for auth — just load committees directly
    if (!this.guestGuard.isGuest()) {
      await this.auth.ready;
    }
    this.loading.set(true);
    this.errorMsg.set('');

    // For guests, only load committees (no membership data)
    const committeesRes = await this.committeeService.getAllCommittees();
    let membershipMap: Record<string, string> = {};

    if (!this.guestGuard.isGuest()) {
      membershipMap = await this.committeeService.getMyMembershipStatuses();
    }

    this.loading.set(false);

    if (committeesRes.error) { this.errorMsg.set(committeesRes.error); return; }

    this.allCommittees.set(committeesRes.data);

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
    } else {
      this.maxAmount.set(10000);
      this.amountFilter.set(10000);
    }
  }

  isOwner(c: Committee): boolean {
    return c.created_by === this.currentUserId();
  }

  getRequestState(c: Committee): RequestState {
    return this.requestStates()[c.id] ?? { requested: false, status: null };
  }

  /**
   * Handles the join action — sends a normal join request (pending approval).
   */
  async joinCommittee(c: Committee, event: Event): Promise<void> {
    event.stopPropagation();

    // Guest users — show sign-in popup
    if (this.guestGuard.isGuest()) {
      this.guestGuard.requireAuth();
      return;
    }

    // Check if committee is full
    const slotsLeft = this.getSlotsLeft(c);
    if (slotsLeft === 0) {
      this.errorMsg.set('This committee is full. No slots available.');
      return;
    }

    // Normal join flow (full member)
    this.joiningId.set(c.id);
    const { error } = await this.committeeService.joinCommittee(c.id);
    this.joiningId.set(null);
    if (error) { 
      this.errorMsg.set(error); 
      return; 
    }
    this.requestStates.update(s => ({ ...s, [c.id]: { requested: true, status: 'pending' } }));
  }

  viewDetails(c: Committee): void {
    this.router.navigate(['/committee', c.id]);
  }

  getSlotsLeft(c: Committee): number { 
    const slotsUsed = c.slots_used ?? 0;
    return Math.max(0, c.max_members - slotsUsed);
  }

  getSlotLabel(c: Committee): string {
    const s = this.getSlotsLeft(c);
    
    // Handle fractional slots
    if (s === 0) return 'NO SLOTS';
    if (s === 0.5) return '0.5 SLOT LEFT';
    if (s === 1) return '1 SLOT LEFT';
    if (s === 1.5) return '1.5 SLOTS LEFT';
    if (s <= 2) return `${s} SLOTS LEFT`;
    
    return `${s} SLOTS OPEN`;
  }

  getSlotStyle(c: Committee): { bg: string; color: string } {
    const s = this.getSlotsLeft(c);
    if (s === 0) return { bg: '#ffdad6', color: '#ba1a1a' }; // Red for full
    if (s === 0.5) return { bg: '#ffdbcd', color: '#7d2d00' }; // Orange for half slot
    if (s <= 2) return { bg: '#ffdbcd', color: '#7d2d00' }; // Orange for limited
    if (s <= 5) return { bg: '#fef9c3', color: '#854d0e' }; // Yellow for moderate
    return { bg: '#d0e1fb', color: '#54647a' }; // Blue for plenty
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
