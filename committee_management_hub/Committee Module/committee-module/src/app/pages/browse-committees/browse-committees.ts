import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { SidebarComponent } from '../../shared/sidebar/sidebar';
import { TopnavComponent } from '../../shared/topnav/topnav';
import { CommitteeService, Committee } from '../../core/committee.service';
import { SharedGroupService } from '../../core/shared-group.service';
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
export class BrowseCommitteesComponent implements OnInit, OnDestroy {

  allCommittees  = signal<Committee[]>([]);
  requestStates  = signal<Record<string, RequestState>>({});
  joiningId      = signal<string | null>(null);
  loading        = signal(true);
  errorMsg       = signal('');
  searchQuery    = signal('');
  maxAmount      = signal(10000);
  amountFilter   = signal(10000);

  sharedGroupToggles = signal<Record<string, boolean>>({});

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

  constructor(
    private committeeService: CommitteeService,
    private sharedGroupService: SharedGroupService,
    private auth: AuthService,
    private router: Router
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
    await this.auth.ready;
    this.loading.set(true);
    this.errorMsg.set('');

    const [committeesRes, membershipMap] = await Promise.all([
      this.committeeService.getAllCommittees(),
      this.committeeService.getMyMembershipStatuses(),
    ]);

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

  /** Returns true if the "Join as Shared Group" toggle is on for this committee. */
  isSharedToggleOn(c: Committee): boolean {
    return this.sharedGroupToggles()[c.id] ?? false;
  }

  /** Flips the shared group toggle for a specific committee card. */
  toggleSharedGroup(c: Committee): void {
    this.sharedGroupToggles.update(t => ({ ...t, [c.id]: !t[c.id] }));
  }

  /**
   * Handles the join action.
   * - If "Join as Shared Group" is enabled: creates a shared group and navigates to /shared-groups.
   * - Otherwise: sends a normal join request (pending approval).
   */
  async joinCommittee(c: Committee, event: Event): Promise<void> {
    event.stopPropagation();

    // Check if committee is full
    const slotsLeft = this.getSlotsLeft(c);
    if (slotsLeft === 0) {
      this.errorMsg.set('This committee is full. No slots available.');
      return;
    }

    // If only 0.5 slot remains, force shared group joining
    if (slotsLeft === 0.5 && !this.isSharedToggleOn(c)) {
      this.errorMsg.set('Only 0.5 slot remains. You must join as a Shared Group.');
      // Auto-enable shared toggle
      this.toggleSharedGroup(c);
      return;
    }

    // If trying to join as full member but less than 1 slot available
    if (!this.isSharedToggleOn(c) && slotsLeft < 1) {
      this.errorMsg.set('Not enough slots for a full member. Please join as a Shared Group.');
      return;
    }

    if (this.isSharedToggleOn(c)) {
      this.joiningId.set(c.id);

      // 1. Create the shared group (in-memory, for the Shared Groups tab)
      const { error: sgError } = await this.sharedGroupService.createSharedGroup(
        c.id,
        c.name,
        c.monthly_amount
      );
      if (sgError) { 
        this.joiningId.set(null); 
        this.errorMsg.set(sgError); 
        return; 
      }

      // 2. Submit a join request with slot_type = 'shared'
      const { error: joinError } = await this.committeeService.joinCommitteeAsShared(c.id);
      this.joiningId.set(null);
      if (joinError) { 
        this.errorMsg.set(joinError); 
        return; 
      }

      // Mark card as pending
      this.requestStates.update(s => ({ ...s, [c.id]: { requested: true, status: 'pending' } }));

      // Navigate to the shared groups page to invite a partner
      this.router.navigate(['/shared-groups']);
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

  /**
   * Check if only shared joining is allowed (when 0.5 slot remains)
   */
  canOnlyJoinAsShared(c: Committee): boolean {
    const slotsLeft = this.getSlotsLeft(c);
    return slotsLeft === 0.5;
  }

  /**
   * Check if full joining is disabled
   */
  isFullJoinDisabled(c: Committee): boolean {
    const slotsLeft = this.getSlotsLeft(c);
    return slotsLeft < 1; // Disable if less than 1 full slot available
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
