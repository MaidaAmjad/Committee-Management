import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  SharedGroupCard,
  SharedGroup,
  SharedGroupMember,
  IndividualPaymentStatus,
  SlotPaymentStatus,
} from '../../core/shared-group.service';

@Component({
  selector: 'app-shared-payment-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './shared-payment-card.html',
  styleUrl: './shared-payment-card.scss',
})
export class SharedPaymentCardComponent {
  @Input() card!: SharedGroupCard;
  @Input() currentUserId!: string;

  // ── Output events ─────────────────────────────────────────────────────────
  @Output() inviteClicked = new EventEmitter<SharedGroup>();
  @Output() cancelInvite  = new EventEmitter<SharedGroup>();
  @Output() uploadProof   = new EventEmitter<{ group: SharedGroup; memberId: string; file: File }>();
  @Output() acceptProof   = new EventEmitter<{ group: SharedGroup; proofId: string }>();
  @Output() rejectProof   = new EventEmitter<{ group: SharedGroup; proofId: string }>();

  // ── Slot status helpers ───────────────────────────────────────────────────

  getSlotStatusStyle(status: SlotPaymentStatus): { bg: string; text: string; border: string } {
    switch (status) {
      case 'Paid':           return { bg: '#d4edda', text: '#155724', border: '#28a745' };
      case 'Partially Paid': return { bg: '#fef9c3', text: '#854d0e', border: '#fde68a' };
      default:               return { bg: '#f2f4f6', text: '#434655', border: '#c3c6d7' };
    }
  }

  getSlotStatusIcon(status: SlotPaymentStatus): string {
    switch (status) {
      case 'Paid':           return 'check_circle';
      case 'Partially Paid': return 'hourglass_bottom';
      default:               return 'pending';
    }
  }

  // ── Individual payment status helpers ─────────────────────────────────────

  getMemberStatusStyle(status: IndividualPaymentStatus): { bg: string; text: string } {
    switch (status) {
      case 'Accepted':  return { bg: '#d4edda', text: '#155724' };
      case 'Submitted': return { bg: '#dbe1ff', text: '#004ac6' };
      case 'Rejected':  return { bg: '#ffdad6', text: '#ba1a1a' };
      default:          return { bg: '#f2f4f6', text: '#434655' };
    }
  }

  getMemberStatusIcon(status: IndividualPaymentStatus): string {
    switch (status) {
      case 'Accepted':  return 'verified';
      case 'Submitted': return 'upload_file';
      case 'Rejected':  return 'cancel';
      default:          return 'pending';
    }
  }

  // ── Visibility helpers ────────────────────────────────────────────────────

  /** True if the current user is this specific member. */
  isCurrentUser(member: SharedGroupMember): boolean {
    return member.user_id === this.currentUserId;
  }

  /** Show upload button only to the relevant member when not yet accepted. */
  canUpload(member: SharedGroupMember): boolean {
    return (
      this.isCurrentUser(member) &&
      member.payment_status !== 'Accepted'
    );
  }

  /** Show accept/reject controls only to the group leader for submitted proofs. */
  canReview(member: SharedGroupMember): boolean {
    return (
      this.card.isLeader &&
      member.payment_status === 'Submitted' &&
      !!member.proof
    );
  }

  // ── Event handlers ────────────────────────────────────────────────────────

  onFileSelected(event: Event, member: SharedGroupMember): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;
    this.uploadProof.emit({ group: this.card.group, memberId: member.user_id, file });
    input.value = ''; // reset so same file can be re-selected
  }

  onAccept(member: SharedGroupMember): void {
    if (!member.proof) return;
    this.acceptProof.emit({ group: this.card.group, proofId: member.proof.id });
  }

  onReject(member: SharedGroupMember): void {
    if (!member.proof) return;
    this.rejectProof.emit({ group: this.card.group, proofId: member.proof.id });
  }

  openFile(url: string): void {
    if (url) window.open(url, '_blank');
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
}
