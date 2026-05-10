import { Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

export interface BroadcastNotification {
  id: string;
  committee_id: string;
  committee_name: string;
  sender_name: string;
  message: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private supabase;

  unreadCount   = signal(0);
  pendingPopups = signal<BroadcastNotification[]>([]);
  currentPopup  = signal<BroadcastNotification | null>(null);

  constructor(
    private supabaseService: SupabaseService,
    private auth: AuthService
  ) {
    this.supabase = this.supabaseService.client;
  }

  /** Call once after auth is ready — loads unread messages AND checks deadline announcements */
  async loadUnread(): Promise<void> {
    const user = this.auth.user();
    if (!user) return;

    // Get all committees the user is an approved member of (not ones they own)
    const { data: memberships } = await this.supabase
      .from('committee_members')
      .select('committee_id')
      .eq('user_id', user.id)
      .eq('status', 'approved');

    if (!memberships?.length) return;

    const committeeIds = memberships.map((m: any) => m.committee_id);

    // Check for deadline announcements (auto-send if deadline just passed)
    await this.checkDeadlineAnnouncements(committeeIds);

    // Get all messages in those committees
    const { data: messages } = await this.supabase
      .from('committee_messages')
      .select('*, committees(name)')
      .in('committee_id', committeeIds)
      .order('created_at', { ascending: false });

    if (!messages?.length) return;

    // Get messages already read by this user
    const messageIds = messages.map((m: any) => m.id);
    const { data: reads } = await this.supabase
      .from('message_reads')
      .select('message_id')
      .eq('user_id', user.id)
      .in('message_id', messageIds);

    const readIds = new Set((reads ?? []).map((r: any) => r.message_id));

    // Filter to unread only
    const unread: BroadcastNotification[] = messages
      .filter((m: any) => !readIds.has(m.id))
      .map((m: any) => ({
        id: m.id,
        committee_id: m.committee_id,
        committee_name: m.committees?.name ?? 'Committee',
        sender_name: m.sender_name,
        message: m.message,
        created_at: m.created_at,
      }));

    this.unreadCount.set(unread.length);

    if (unread.length > 0) {
      this.pendingPopups.set([...unread].reverse());
      this.showNextPopup();
    }
  }

  /** Auto-send deadline announcement if deadline just passed and no announcement sent yet today */
  private async checkDeadlineAnnouncements(committeeIds: string[]): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    const { data: committees } = await this.supabase
      .from('committees')
      .select('id, name, payment_deadline_date, created_by')
      .in('id', committeeIds);

    if (!committees?.length) return;

    for (const c of committees) {
      if (!c.payment_deadline_date) continue;

      const deadline = new Date(c.payment_deadline_date + 'T23:59:59');
      const now      = new Date();

      // Only trigger on the deadline day
      if (c.payment_deadline_date !== today) continue;

      // Check if announcement already sent today
      const { data: existing } = await this.supabase
        .from('committee_messages')
        .select('id')
        .eq('committee_id', c.id)
        .ilike('message', '%payment deadline%')
        .gte('created_at', today + 'T00:00:00')
        .maybeSingle();

      if (existing) continue; // already sent

      // Auto-send announcement as system message
      await this.supabase.from('committee_messages').insert({
        committee_id: c.id,
        sender_id:    c.created_by,
        sender_name:  '🔔 System',
        message:      `Committee payment deadline has been reached for "${c.name}". Please submit your payment proof as soon as possible.`,
      });
    }
  }

  showNextPopup(): void {
    const queue = this.pendingPopups();
    if (queue.length > 0) {
      this.currentPopup.set(queue[0]);
    }
  }

  /** Mark current popup as read and advance to next */
  async dismissPopup(): Promise<void> {
    const popup = this.currentPopup();
    if (!popup) return;

    const user = this.auth.user();
    if (user) {
      console.log('💾 Saving read for message:', popup.id, 'user:', user.id);
      
      const { data, error } = await this.supabase
        .from('message_reads')
        .upsert(
          { message_id: popup.id, user_id: user.id },
          { onConflict: 'message_id,user_id', ignoreDuplicates: true }
        )
        .select();
      
      if (error) {
        console.error('❌ Failed to mark message as read:', error.message, error);
      } else {
        console.log('✅ Message marked as read:', data);
      }
    }

    // Remove from queue
    const remaining = this.pendingPopups().slice(1);
    this.pendingPopups.set(remaining);
    this.unreadCount.update(n => Math.max(0, n - 1));

    if (remaining.length > 0) {
      this.currentPopup.set(remaining[0]);
    } else {
      this.currentPopup.set(null);
    }
  }

  /** Mark all as read without showing popups */
  async markAllRead(): Promise<void> {
    const user = this.auth.user();
    if (!user) return;

    const popups = this.pendingPopups();
    if (!popups.length) return;

    const inserts = popups.map(p => ({ message_id: p.id, user_id: user.id }));
    const { error } = await this.supabase.from('message_reads').upsert(
      inserts,
      { onConflict: 'message_id,user_id', ignoreDuplicates: true }
    );
    if (error) console.error('Failed to mark all as read:', error.message);

    this.pendingPopups.set([]);
    this.currentPopup.set(null);
    this.unreadCount.set(0);
  }
}
