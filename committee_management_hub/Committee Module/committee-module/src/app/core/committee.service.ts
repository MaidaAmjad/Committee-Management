import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

export interface CommitteeFormData {
  name: string;
  monthlyAmount: number;
  maxMembers: number;
  description: string;
  durationMonths: number;
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
}

export interface CommitteeMember {
  id: string;
  committee_id: string;
  user_id: string;
  joined_at: string;
  full_name: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
}

@Injectable({ providedIn: 'root' })
export class CommitteeService {
  private supabase;

  constructor(
    private supabaseService: SupabaseService,
    private auth: AuthService
  ) {
    this.supabase = this.supabaseService.client;
  }

  /** Insert a new committee row owned by the current user */
  async createCommittee(data: CommitteeFormData): Promise<{ error: string | null }> {
    const user = this.auth.user();
    if (!user) return { error: 'Not authenticated' };

    const { error } = await this.supabase.from('committees').insert({
      name:            data.name,
      monthly_amount:  data.monthlyAmount,
      max_members:     data.maxMembers,
      description:     data.description,
      duration_months: data.durationMonths,
      created_by:      user.id,
      status:          'Recruiting',
    });

    if (error) return { error: error.message };
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
    const { data, error } = await this.supabase
      .from('committees')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return { data: [], error: error.message };
    return { data: data as Committee[], error: null };
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

  /** Join a committee — creates a PENDING request */
  async joinCommittee(committeeId: string): Promise<{ error: string | null }> {
    const user = this.auth.user();
    if (!user) return { error: 'Not authenticated' };

    const { error } = await this.supabase.from('committee_members').insert({
      committee_id: committeeId,
      user_id:      user.id,
      full_name:    user.user_metadata?.['full_name'] || user.email?.split('@')[0] || 'User',
      email:        user.email,
      status:       'pending',
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
    return { data: data as CommitteeMember[], error: null };
  }

  /** Get only PENDING requests for committees owned by current user */
  async getPendingRequests(): Promise<{ data: (CommitteeMember & { committee_name: string })[]; error: string | null }> {
    const user = this.auth.user();
    if (!user) return { data: [], error: 'Not authenticated' };

    // Get all committees owned by this user
    const { data: myCommittees } = await this.supabase
      .from('committees')
      .select('id, name')
      .eq('created_by', user.id);

    if (!myCommittees?.length) return { data: [], error: null };

    const ids = myCommittees.map((c: { id: string }) => c.id);
    const nameMap: Record<string, string> = {};
    myCommittees.forEach((c: { id: string; name: string }) => { nameMap[c.id] = c.name; });

    const { data, error } = await this.supabase
      .from('committee_members')
      .select('*')
      .in('committee_id', ids)
      .eq('status', 'pending')
      .order('joined_at', { ascending: false });

    if (error) return { data: [], error: error.message };

    const enriched = (data as CommitteeMember[]).map(m => ({
      ...m,
      committee_name: nameMap[m.committee_id] ?? 'Unknown',
    }));

    return { data: enriched, error: null };
  }

  /** Approve a join request */
  async approveRequest(memberId: string): Promise<{ error: string | null }> {
    const { error } = await this.supabase
      .from('committee_members')
      .update({ status: 'approved' })
      .eq('id', memberId);

    if (error) return { error: error.message };
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
