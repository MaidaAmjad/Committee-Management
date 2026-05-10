import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { SidebarComponent } from '../../shared/sidebar/sidebar';
import { TopnavComponent } from '../../shared/topnav/topnav';
import {
  SharedGroupService,
  SharedGroup,
  SharedGroupCard,
} from '../../core/shared-group.service';
import { AuthService } from '../../core/auth.service';
import { SharedPaymentCardComponent } from './shared-payment-card';
import { InviteMemberModalComponent } from './invite-member-modal';
import { SupabaseService } from '../../core/supabase.service';

@Component({
  selector: 'app-shared-group',
  standalone: true,
  imports: [
    CommonModule,
    SidebarComponent,
    TopnavComponent,
    SharedPaymentCardComponent,
    InviteMemberModalComponent,
  ],
  templateUrl: './shared-group.html',
  styleUrl: './shared-group.scss',
})
export class SharedGroupComponent implements OnInit, OnDestroy {
  cards       = signal<SharedGroupCard[]>([]);
  loading     = signal(true);
  errorMsg    = signal('');
  activeModal = signal<string | null>(null);
  activeTab   = signal<'active' | 'recent'>('active');

  currentUserId = computed(() => this.auth.user()?.id ?? '');

  // Active = committee not completed
  activeCards = computed(() =>
    this.cards().filter(c => c.group.status !== 'Completed')
  );

  // Recent = committee completed
  recentCards = computed(() =>
    this.cards().filter(c => c.group.status === 'Completed')
  );

  private routerSub?: Subscription;
  private supabase;

  constructor(
    private sharedGroupService: SharedGroupService,
    private auth: AuthService,
    private router: Router,
    private supabaseService: SupabaseService
  ) {
    this.supabase = this.supabaseService.client;
  }

  async ngOnInit(): Promise<void> {
    await this.auth.ready;
    await this.loadGroups();

    // Reload every time the user navigates back to /shared-groups
    this.routerSub = this.router.events.pipe(
      filter(e => e instanceof NavigationEnd && e.urlAfterRedirects.startsWith('/shared-groups'))
    ).subscribe(() => this.loadGroups());
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  async loadGroups(): Promise<void> {
    this.loading.set(true);
    this.errorMsg.set('');

    const { data, error } = await this.sharedGroupService.getMySharedGroups();
    this.loading.set(false);

    if (error) { this.errorMsg.set(error); return; }

    const monthYear = this.sharedGroupService.getCurrentMonthYear();
    const userId    = this.currentUserId();

    // Fetch committee statuses to detect completed ones
    const committeeIds = [...new Set((data ?? []).map(g => g.committee_id))];
    let committeeStatusMap: Record<string, string> = {};

    if (committeeIds.length > 0) {
      const { data: committees } = await this.supabase
        .from('committees')
        .select('id, status')
        .in('id', committeeIds);
      (committees || []).forEach((c: any) => {
        committeeStatusMap[c.id] = c.status;
      });
    }

    // Build view-model cards — mark group as Completed if committee is Completed
    const cardList: SharedGroupCard[] = (data ?? []).map(group => {
      const committeeStatus = committeeStatusMap[group.committee_id] ?? '';
      const enrichedGroup: SharedGroup = {
        ...group,
        status: committeeStatus === 'Completed' ? 'Completed' : group.status,
      };
      return {
        group: enrichedGroup,
        isLeader:        group.group_leader.user_id === userId,
        isMember:        group.group_member?.user_id === userId,
        monthYear,
        showUploadModal: false,
        uploading:       false,
        uploadError:     '',
      };
    });

    this.cards.set(cardList);

    // Auto-switch to Recent tab if there are no active groups but there are recent ones
    const hasActive = cardList.some(c => c.group.status !== 'Completed');
    const hasRecent = cardList.some(c => c.group.status === 'Completed');
    if (!hasActive && hasRecent) {
      this.activeTab.set('recent');
    }
  }

  // ── Invite modal ──────────────────────────────────────────────────────────

  openInviteModal(group: SharedGroup): void {
    this.activeModal.set(group.id);
  }

  closeInviteModal(): void {
    this.activeModal.set(null);
  }

  async onInviteSubmitted(payload: { groupId: string; inviteeEmail: string }): Promise<void> {
    const { error } = await this.sharedGroupService.inviteMember(
      payload.groupId,
      payload.inviteeEmail
    );
    this.closeInviteModal();
    if (error) { this.errorMsg.set(error); return; }
    await this.loadGroups(); // refresh to show "Pending Member" state
  }

  // ── Cancel invite ─────────────────────────────────────────────────────────

  async onCancelInvite(group: SharedGroup): Promise<void> {
    const { error } = await this.sharedGroupService.cancelInvitation(group.id);
    if (error) { this.errorMsg.set(error); return; }
    await this.loadGroups();
  }

  // ── Proof upload ──────────────────────────────────────────────────────────

  async onUploadProof(payload: {
    group: SharedGroup;
    memberId: string;
    file: File;
  }): Promise<void> {
    const monthYear = this.sharedGroupService.getCurrentMonthYear();
    const { error } = await this.sharedGroupService.uploadProof(
      payload.group.id,
      payload.memberId,
      payload.file,
      monthYear
    );
    if (error) { this.errorMsg.set(error); return; }
    await this.loadGroups();
  }

  // ── Proof review (admin/leader) ───────────────────────────────────────────

  async onAcceptProof(payload: { group: SharedGroup; proofId: string }): Promise<void> {
    const { error } = await this.sharedGroupService.acceptProof(
      payload.group.id,
      payload.proofId
    );
    if (error) { this.errorMsg.set(error); return; }
    await this.loadGroups();
  }

  async onRejectProof(payload: { group: SharedGroup; proofId: string }): Promise<void> {
    const { error } = await this.sharedGroupService.rejectProof(
      payload.group.id,
      payload.proofId
    );
    if (error) { this.errorMsg.set(error); return; }
    await this.loadGroups();
  }

  goToCreate(): void {
    this.router.navigate(['/create-committee']);
  }
}
