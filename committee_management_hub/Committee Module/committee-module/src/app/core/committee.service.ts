import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { ReviewService } from './review.service';

export interface CommitteeFormData {
  name: string;
  monthlyAmount: number;
  maxMembers: number;
  description: string;
  durationMonths: number;
  paymentDeadlineDate: string;  // ISO date string e.g. "2026-06-10"
  gracePeriodDays: number;
  paymentCycleDays: number;     // e.g. 30 for monthly, 10 for 10-day cycle
  distributionMethod: 'random' | 'manual'; // Winner selection method
}

export interface Committee {
  id: string;
  name: string;
  monthly_amount: number;
  max_members: number;
  description: string;
  duration_months: number;
  created_by: string;
  status: string;
  created_at: string;
  payment_deadline_date: string | null;
  grace_period_days: number;
  payment_cycle_days: number;
  distribution_method: 'random' | 'manual'; // Winner selection method
  member_count?: number;
  slots_used?: number; // Total slots used (including 0.5 for shared members)
  has_partial_slot?: boolean; // True if there's a 0.5 slot available
}

export interface CommitteeMember {
  id: string;
  committee_id: string;
  user_id: string;
  joined_at: string;
  full_name: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  slot_type?: 'full' | 'shared';
  is_verified?: boolean;
}

export type PendingJoinRequest = CommitteeMember & {
  committee_name: string;
  max_members: number;
  slots_used: number;
  slots_remaining: number;
  can_approve: boolean;
};

/** Slot weight: full member = 1, shared pair = 0.5 each. */
export function memberSlotWeight(slotType?: string | null): number {
  return slotType === 'shared' ? 0.5 : 1;
}

export function sumApprovedSlotWeight(
  members: { status: string; slot_type?: string | null }[]
): number {
  return members
    .filter(m => m.status === 'approved')
    .reduce((sum, m) => sum + memberSlotWeight(m.slot_type), 0);
}

@Injectable({ providedIn: 'root' })
export class CommitteeService {
  private supabase;

  constructor(
    private supabaseService: SupabaseService,
    private auth: AuthService,
    private reviewService: ReviewService
  ) {
    this.supabase = this.supabaseService.client;
  }

  /** Insert a new committee row owned by the current user */
  async createCommittee(data: CommitteeFormData): Promise<{ error: string | null }> {
    const user = this.auth.user();
    if (!user) return { error: 'Not authenticated' };

    const { data: newCommittee, error } = await this.supabase.from('committees').insert({
      name:                   data.name,
      monthly_amount:         data.monthlyAmount,
      max_members:            data.maxMembers,
      description:            data.description,
      duration_months:        data.durationMonths,
      created_by:             user.id,
      status:                 'Recruiting',
      payment_deadline_date:  data.paymentDeadlineDate || null,
      grace_period_days:      data.gracePeriodDays ?? 3,
      payment_cycle_days:     data.paymentCycleDays ?? 30,
      distribution_method:    data.distributionMethod || 'random',
    }).select('id').single();

    if (error) return { error: error.message };

    // Auto-add the creator as the first approved member
    const { error: memberError } = await this.supabase.from('committee_members').insert({
      committee_id: newCommittee.id,
      user_id:      user.id,
      full_name:    user.user_metadata?.['full_name'] || user.email?.split('@')[0] || 'Admin',
      email:        user.email,
      status:       'approved',
      slot_type:    'full', // Creator always occupies a full slot
    });

    if (memberError) {
      console.warn('Auto-member insert failed:', memberError.message);
      // Don't fail the whole operation — committee was created
    } else {
      await this.reviewService.recalculateTrustScore(user.id);
    }

    return { error: null };
  }

  /** Fetch all committees created by the current user */
  async getMyCommittees(): Promise<{ data: Committee[]; error: string | null }> {
    const user = this.auth.user();
    if (!user) return { data: [], error: 'Not authenticated' };

    const { data, error } = await this.supabase
      .from('committees')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (error) return { data: [], error: error.message };
    return { data: data as Committee[], error: null };
  }

  /** Fetch ALL committees from all users (Browse page) */
  async getAllCommittees(): Promise<{ data: Committee[]; error: string | null }> {
    // Fetch committees — exclude Completed ones from Browse
    const { data: committees, error: committeesError } = await this.supabase
      .from('committees')
      .select('*')
      .neq('status', 'Completed')
      .order('created_at', { ascending: false });

    if (committeesError) return { data: [], error: committeesError.message };
    if (!committees || committees.length === 0) return { data: [], error: null };

    // Fetch all approved members with their slot types
    const { data: members, error: membersError } = await this.supabase
      .from('committee_members')
      .select('committee_id, slot_type')
      .eq('status', 'approved');

    if (membersError) {
      console.warn('Failed to fetch members:', membersError.message);
      return { data: committees as Committee[], error: null };
    }

    // Calculate slot usage per committee
    const slotUsageMap: Record<string, { count: number; slotsUsed: number; hasPartialSlot: boolean }> = {};
    
    members?.forEach(m => {
      if (!slotUsageMap[m.committee_id]) {
        slotUsageMap[m.committee_id] = { count: 0, slotsUsed: 0, hasPartialSlot: false };
      }
      
      // Default to 'full' if slot_type is not set (backward compatibility)
      const slotType = m.slot_type || 'full';
      slotUsageMap[m.committee_id].count++;
      
      if (slotType === 'shared') {
        slotUsageMap[m.committee_id].slotsUsed += 0.5;
      } else {
        slotUsageMap[m.committee_id].slotsUsed += 1;
      }
    });

    // Check for partial slots (0.5 remaining)
    Object.keys(slotUsageMap).forEach(committeeId => {
      const usage = slotUsageMap[committeeId];
      const fractionalPart = usage.slotsUsed % 1;
      usage.hasPartialSlot = fractionalPart === 0.5;
    });

    // Attach slot usage to each committee
    const enriched = committees.map(c => {
      const usage = slotUsageMap[c.id] || { count: 0, slotsUsed: 0, hasPartialSlot: false };
      return {
        ...c,
        member_count: usage.count,
        slots_used: usage.slotsUsed,
        has_partial_slot: usage.hasPartialSlot
      };
    }) as Committee[];

    return { data: enriched, error: null };
  }

  /** Fetch a single committee by id */
  async getCommitteeById(id: string): Promise<{ data: Committee | null; error: string | null }> {
    const { data, error } = await this.supabase
      .from('committees')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as Committee, error: null };
  }

  /** Approved slot usage for a committee (full = 1, shared = 0.5). */
  async getCommitteeSlotUsage(committeeId: string): Promise<{
    maxMembers: number;
    slotsUsed: number;
    slotsRemaining: number;
    isFull: boolean;
    error: string | null;
  }> {
    const { data: committee, error: committeeError } = await this.supabase
      .from('committees')
      .select('max_members')
      .eq('id', committeeId)
      .maybeSingle();

    if (committeeError) {
      return { maxMembers: 0, slotsUsed: 0, slotsRemaining: 0, isFull: true, error: committeeError.message };
    }
    if (!committee) {
      return { maxMembers: 0, slotsUsed: 0, slotsRemaining: 0, isFull: true, error: 'Committee not found.' };
    }

    const { data: members, error: membersError } = await this.supabase
      .from('committee_members')
      .select('status, slot_type')
      .eq('committee_id', committeeId)
      .eq('status', 'approved');

    if (membersError) {
      return {
        maxMembers: committee.max_members,
        slotsUsed: 0,
        slotsRemaining: 0,
        isFull: true,
        error: membersError.message,
      };
    }

    const slotsUsed = sumApprovedSlotWeight(members ?? []);
    const maxMembers = committee.max_members ?? 0;
    const slotsRemaining = Math.max(0, maxMembers - slotsUsed);

    return {
      maxMembers,
      slotsUsed,
      slotsRemaining,
      isFull: slotsRemaining <= 0,
      error: null,
    };
  }

  /** Join a committee — creates a PENDING request */
  async joinCommittee(committeeId: string): Promise<{ error: string | null }> {
    const user = this.auth.user();
    if (!user) return { error: 'Not authenticated' };

    const capacity = await this.getCommitteeSlotUsage(committeeId);
    if (capacity.error) return { error: capacity.error };
    if (capacity.isFull) {
      return { error: 'This committee is full. No slots available.' };
    }

    const { error } = await this.supabase.from('committee_members').insert({
      committee_id: committeeId,
      user_id:      user.id,
      full_name:    user.user_metadata?.['full_name'] || user.email?.split('@')[0] || 'User',
      email:        user.email,
      status:       'pending',
      slot_type:    'full', // Full member
    });

    if (error) return { error: error.message };
    return { error: null };
  }

  /** Leave / cancel a committee request */
  async leaveCommittee(committeeId: string): Promise<{ error: string | null }> {
    const user = this.auth.user();
    if (!user) return { error: 'Not authenticated' };

    const { error } = await this.supabase
      .from('committee_members')
      .delete()
      .eq('committee_id', committeeId)
      .eq('user_id', user.id);

    if (error) return { error: error.message };
    return { error: null };
  }

  /** Check if current user has a request (any status) for a committee */
  async hasRequested(committeeId: string): Promise<{ requested: boolean; status: string | null }> {
    const user = this.auth.user();
    if (!user) return { requested: false, status: null };

    const { data } = await this.supabase
      .from('committee_members')
      .select('status')
      .eq('committee_id', committeeId)
      .eq('user_id', user.id)
      .maybeSingle();

    return { requested: !!data, status: data?.status ?? null };
  }

  /** @deprecated use hasRequested */
  async hasJoined(committeeId: string): Promise<boolean> {
    const { requested } = await this.hasRequested(committeeId);
    return requested;
  }

  /** Get all members of a committee (all statuses) */
  async getCommitteeMembers(committeeId: string): Promise<{ data: CommitteeMember[]; error: string | null }> {
    const { data, error } = await this.supabase
      .from('committee_members')
      .select('*')
      .eq('committee_id', committeeId)
      .order('joined_at', { ascending: true });

    if (error) return { data: [], error: error.message };
    if (!data || data.length === 0) return { data: [], error: null };

    // Fetch verification status for all members separately (avoids FK join issues)
    const userIds = data.map((m: any) => m.user_id);
    const { data: profiles } = await this.supabase
      .from('profiles')
      .select('id, is_verified')
      .in('id', userIds);

    const verifiedMap: Record<string, boolean> = {};
    (profiles || []).forEach((p: any) => {
      verifiedMap[p.id] = p.is_verified ?? false;
    });

    const members = data.map((m: any) => ({
      ...m,
      is_verified: verifiedMap[m.user_id] ?? false,
    }));

    return { data: members as CommitteeMember[], error: null };
  }

  /** Get only PENDING requests for committees owned by current user */
  async getPendingRequests(): Promise<{ data: PendingJoinRequest[]; error: string | null }> {
    const user = this.auth.user();
    if (!user) return { data: [], error: 'Not authenticated' };

    // Get all committees owned by this user
    const { data: myCommittees } = await this.supabase
      .from('committees')
      .select('id, name, max_members')
      .eq('created_by', user.id);

    if (!myCommittees?.length) return { data: [], error: null };

    const ids = myCommittees.map((c: { id: string }) => c.id);
    const committeeMeta: Record<string, { name: string; max_members: number }> = {};
    myCommittees.forEach((c: { id: string; name: string; max_members: number }) => {
      committeeMeta[c.id] = { name: c.name, max_members: c.max_members };
    });

    const { data: approvedRows } = await this.supabase
      .from('committee_members')
      .select('committee_id, slot_type')
      .in('committee_id', ids)
      .eq('status', 'approved');

    const slotsUsedByCommittee: Record<string, number> = {};
    (approvedRows ?? []).forEach((row: { committee_id: string; slot_type?: string }) => {
      const weight = memberSlotWeight(row.slot_type);
      slotsUsedByCommittee[row.committee_id] = (slotsUsedByCommittee[row.committee_id] ?? 0) + weight;
    });

    const { data, error } = await this.supabase
      .from('committee_members')
      .select('*')
      .in('committee_id', ids)
      .eq('status', 'pending')
      .order('joined_at', { ascending: false });

    if (error) return { data: [], error: error.message };

    const enriched: PendingJoinRequest[] = (data as CommitteeMember[]).map(m => {
      const meta = committeeMeta[m.committee_id];
      const maxMembers = meta?.max_members ?? 0;
      const slotsUsed = slotsUsedByCommittee[m.committee_id] ?? 0;
      const requestWeight = memberSlotWeight(m.slot_type);
      const slotsRemaining = Math.max(0, maxMembers - slotsUsed);

      return {
        ...m,
        committee_name: meta?.name ?? 'Unknown',
        max_members: maxMembers,
        slots_used: slotsUsed,
        slots_remaining: slotsRemaining,
        can_approve: slotsUsed + requestWeight <= maxMembers,
      };
    });

    return { data: enriched, error: null };
  }

  /** Approve a join request (blocked when committee is at max_members). */
  async approveRequest(memberId: string): Promise<{ error: string | null }> {
    const { data: pendingMember, error: fetchError } = await this.supabase
      .from('committee_members')
      .select('id, committee_id, status, slot_type, user_id')
      .eq('id', memberId)
      .maybeSingle();

    if (fetchError) return { error: fetchError.message };
    if (!pendingMember) return { error: 'Request not found.' };
    if (pendingMember.status !== 'pending') {
      return { error: 'This request is no longer pending.' };
    }

    const capacity = await this.getCommitteeSlotUsage(pendingMember.committee_id);
    if (capacity.error) return { error: capacity.error };

    const requestWeight = memberSlotWeight(pendingMember.slot_type);
    if (capacity.slotsUsed + requestWeight > capacity.maxMembers) {
      return {
        error: `Committee is full (${capacity.slotsUsed}/${capacity.maxMembers} slots used). Reject extra requests or increase max members.`,
      };
    }

    const { data: updated, error } = await this.supabase
      .from('committee_members')
      .update({ status: 'approved' })
      .eq('id', memberId)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();

    if (error) {
      const msg = error.message.includes('Committee is full')
        ? 'Committee is full. Cannot approve more members.'
        : error.message;
      return { error: msg };
    }

    if (!updated) {
      return { error: 'Could not approve. The committee may be full or this request was already handled.' };
    }

    if (pendingMember.user_id) {
      await this.reviewService.recalculateTrustScore(pendingMember.user_id);
    }
    return { error: null };
  }

  /** Reject a join request */
  async rejectRequest(memberId: string): Promise<{ error: string | null }> {
    const { error } = await this.supabase
      .from('committee_members')
      .update({ status: 'rejected' })
      .eq('id', memberId);

    if (error) return { error: error.message };
    return { error: null };
  }

  /** Get all membership statuses for the current user in one query */
  async getMyMembershipStatuses(): Promise<Record<string, string>> {
    const user = this.auth.user();
    if (!user) return {};

    const { data, error } = await this.supabase
      .from('committee_members')
      .select('committee_id, status')
      .eq('user_id', user.id);

    if (error || !data) return {};

    const map: Record<string, string> = {};
    data.forEach((row: { committee_id: string; status: string }) => {
      map[row.committee_id] = row.status;
    });
    return map;
  }
  /** Fetch committees the current user has been APPROVED to join (not ones they created) */
  async getJoinedCommittees(): Promise<{ data: Committee[]; error: string | null }> {
    const user = this.auth.user();
    if (!user) return { data: [], error: 'Not authenticated' };

    // Step 1: get approved membership ids
    const { data: memberships, error: memErr } = await this.supabase
      .from('committee_members')
      .select('committee_id')
      .eq('user_id', user.id)
      .eq('status', 'approved');

    if (memErr) return { data: [], error: memErr.message };
    if (!memberships?.length) return { data: [], error: null };

    const ids = memberships.map((m: { committee_id: string }) => m.committee_id);

    // Step 2: fetch those committees excluding ones the user created
    const { data, error } = await this.supabase
      .from('committees')
      .select('*')
      .in('id', ids)
      .neq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (error) return { data: [], error: error.message };
    return { data: data as Committee[], error: null };
  }
  /** Send a broadcast message to all committee members */
  async sendBroadcast(committeeId: string, message: string): Promise<{ error: string | null }> {
    const user = this.auth.user();
    if (!user) return { error: 'Not authenticated' };

    const { error } = await this.supabase.from('committee_messages').insert({
      committee_id: committeeId,
      sender_id:    user.id,
      sender_name:  user.user_metadata?.['full_name'] || user.email?.split('@')[0] || 'Admin',
      message,
    });

    if (error) return { error: error.message };
    return { error: null };
  }

  /** Get all broadcast messages for a committee */
  async getBroadcasts(committeeId: string): Promise<{ data: any[]; error: string | null }> {
    const { data, error } = await this.supabase
      .from('committee_messages')
      .select('*')
      .eq('committee_id', committeeId)
      .order('created_at', { ascending: false });

    if (error) return { data: [], error: error.message };
    return { data: data ?? [], error: null };
  }

  async getMemberCount(committeeId: string): Promise<number> {
    const { count } = await this.supabase
      .from('committee_members')
      .select('*', { count: 'exact', head: true })
      .eq('committee_id', committeeId)
      .eq('status', 'approved');

    return count ?? 0;
  }
}
