import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
export class SharedGroupComponent implements OnInit {
  // ── State signals ─────────────────────────────────────────────────────────
  cards       = signal<SharedGroupCard[]>([]);
  loading     = signal(true);
  errorMsg    = signal('');
  /** ID of the group whose invite modal is currently open, or null. */
  activeModal = signal<string | null>(null);

  currentUserId = computed(() => this.auth.user()?.id ?? '');

  constructor(
    private sharedGroupService: SharedGroupService,
    private auth: AuthService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    await this.auth.ready;
    await this.loadGroups();
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

    // Build view-model cards from raw SharedGroup data
    const cardList: SharedGroupCard[] = (data ?? []).map(group => ({
      group,
      isLeader:        group.group_leader.user_id === userId,
      isMember:        group.group_member?.user_id === userId,
      monthYear,
      showUploadModal: false,
      uploading:       false,
      uploadError:     '',
    }));

    this.cards.set(cardList);
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
