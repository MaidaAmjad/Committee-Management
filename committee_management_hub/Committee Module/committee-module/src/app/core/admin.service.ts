import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Committee, CommitteeMember } from './committee.service';

// ── Admin-specific interfaces ─────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  trust_score: number;
  status: 'active' | 'suspended' | 'pending';
  committee_count: number;
  created_at: string;
  payment_setup_complete: boolean;
}

export interface AdminCommittee extends Committee {
  creator_name: string;
  member_count: number;
  total_pool: number;
  payment_progress: number; // 0–100
}

export interface AdminStats {
  totalUsers: number;
  activeCommittees: number;
  completedCommittees: number;
  totalCapital: number;
  pendingRequests: number;
  suspendedUsers: number;
}

export interface AdminReport {
  id: string;
  case_id: string;
  reporter_name: string;
  target_name: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  status: 'open' | 'resolved' | 'ignored';
  created_at: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class AdminService {
  private supabase;

  constructor(private supabaseService: SupabaseService) {
    this.supabase = this.supabaseService.client;
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  /**
   * Computes platform-wide summary statistics from real DB data.
   * Runs all counts in parallel for performance.
   */
  async getStats(): Promise<{ data: AdminStats; error: string | null }> {
    const [
      usersRes,
      activeRes,
      completedRes,
      pendingRes,
      committeesRes,
    ] = await Promise.all([
      this.supabase.from('profiles').select('*', { count: 'exact', head: true }),
      this.supabase.from('committees').select('*', { count: 'exact', head: true }).eq('status', 'Active'),
      this.supabase.from('committees').select('*', { count: 'exact', head: true }).eq('status', 'Completed'),
      this.supabase.from('committee_members').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      this.supabase.from('committees').select('monthly_amount, max_members, duration_months'),
    ]);

    const committees = (committeesRes.data ?? []) as any[];
    const totalCapital = committees.reduce(
      (sum: number, c: any) => sum + (c.monthly_amount ?? 0) * (c.max_members ?? 0) * (c.duration_months ?? 0),
      0
    );

    const data: AdminStats = {
      totalUsers:          usersRes.count ?? 0,
      activeCommittees:    activeRes.count ?? 0,
      completedCommittees: completedRes.count ?? 0,
      totalCapital,
      pendingRequests:     pendingRes.count ?? 0,
      suspendedUsers:      0, // requires is_suspended column — shown as 0 if not present
    };

    return { data, error: null };
  }

  // ── Users ─────────────────────────────────────────────────────────────────

  /**
   * Returns all platform users from the `profiles` table, enriched with
   * their committee membership count and payment setup status.
   * Works with the actual schema: id, full_name, email, created_at,
   * payment_setup_complete. trust_score and is_suspended are optional columns
   * — the query degrades gracefully if they don't exist.
   */
  async getAllUsers(): Promise<{ data: AdminUser[]; error: string | null }> {
    // Fetch all profiles — select only columns we know exist
    const { data: profiles, error: profileErr } = await this.supabase
      .from('profiles')
      .select('id, full_name, email, created_at, payment_setup_complete')
      .order('created_at', { ascending: false });

    if (profileErr) return { data: [], error: profileErr.message };
    if (!profiles?.length) return { data: [], error: null };

    // Fetch all approved membership counts in one query
    const { data: memberships } = await this.supabase
      .from('committee_members')
      .select('user_id')
      .eq('status', 'approved');

    const countMap: Record<string, number> = {};
    (memberships ?? []).forEach((m: any) => {
      countMap[m.user_id] = (countMap[m.user_id] ?? 0) + 1;
    });

    const users: AdminUser[] = profiles.map((p: any) => ({
      id:                     p.id,
      full_name:              p.full_name || p.email?.split('@')[0] || 'Unknown',
      email:                  p.email || '',
      trust_score:            p.trust_score ?? 100,
      status:                 p.is_suspended ? 'suspended' : (p.payment_setup_complete ? 'active' : 'pending'),
      committee_count:        countMap[p.id] ?? 0,
      created_at:             p.created_at,
      payment_setup_complete: p.payment_setup_complete ?? false,
    }));

    return { data: users, error: null };
  }

  /**
   * Suspends a user. Attempts to set `is_suspended = true` in profiles.
   * If the column doesn't exist yet, the error is surfaced to the caller.
   * To add this column: ALTER TABLE profiles ADD COLUMN is_suspended boolean DEFAULT false;
   */
  async suspendUser(userId: string): Promise<{ error: string | null }> {
    const { error } = await this.supabase
      .from('profiles')
      .update({ is_suspended: true } as any)
      .eq('id', userId);

    if (error) {
      if (error.message.includes('column') || error.code === '42703') {
        return { error: 'The "is_suspended" column does not exist in the profiles table yet. Run: ALTER TABLE profiles ADD COLUMN is_suspended boolean DEFAULT false;' };
      }
      return { error: error.message };
    }
    return { error: null };
  }

  /**
   * Reinstates a suspended user by setting `is_suspended = false`.
   */
  async reinstateUser(userId: string): Promise<{ error: string | null }> {
    const { error } = await this.supabase
      .from('profiles')
      .update({ is_suspended: false } as any)
      .eq('id', userId);

    if (error) {
      if (error.message.includes('column') || error.code === '42703') {
        return { error: 'The "is_suspended" column does not exist in the profiles table yet.' };
      }
      return { error: error.message };
    }
    return { error: null };
  }

  /**
   * Deletes a user's profile row and all their committee memberships.
   */
  async deleteUser(userId: string): Promise<{ error: string | null }> {
    const { error: memErr } = await this.supabase
      .from('committee_members')
      .delete()
      .eq('user_id', userId);

    if (memErr) return { error: this.rlsHint('committee_members', 'DELETE', memErr.message) };

    const { error } = await this.supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (error) return { error: this.rlsHint('profiles', 'DELETE', error.message) };
    return { error: null };
  }

  // ── Committees ────────────────────────────────────────────────────────────

  /**
   * Returns all committees enriched with creator name and approved member count.
   * Uses a join-style approach: fetch committees, then resolve creator names
   * from profiles and member counts from committee_members.
   */
  async getAllCommittees(): Promise<{ data: AdminCommittee[]; error: string | null }> {
    // Fetch all committees
    const { data: committees, error: cErr } = await this.supabase
      .from('committees')
      .select('*')
      .order('created_at', { ascending: false });

    if (cErr) return { data: [], error: cErr.message };
    if (!committees?.length) return { data: [], error: null };

    // Fetch all approved member counts in one query
    const { data: memberships } = await this.supabase
      .from('committee_members')
      .select('committee_id')
      .eq('status', 'approved');

    const memberCountMap: Record<string, number> = {};
    (memberships ?? []).forEach((m: any) => {
      memberCountMap[m.committee_id] = (memberCountMap[m.committee_id] ?? 0) + 1;
    });

    // Collect unique creator IDs and fetch their names from profiles
    const creatorIds = [...new Set(committees.map((c: any) => c.created_by))];
    const { data: creators } = await this.supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', creatorIds);

    const creatorMap: Record<string, string> = {};
    (creators ?? []).forEach((p: any) => {
      creatorMap[p.id] = p.full_name || p.email?.split('@')[0] || 'Unknown';
    });

    const enriched: AdminCommittee[] = committees.map((c: any) => {
      const memberCount = memberCountMap[c.id] ?? 0;
      const totalPool   = (c.monthly_amount ?? 0) * (c.max_members ?? 0) * (c.duration_months ?? 0);
      // payment_progress: ratio of approved members to max_members (as a rough proxy)
      const progress    = c.max_members > 0 ? Math.round((memberCount / c.max_members) * 100) : 0;

      return {
        ...c,
        creator_name:     creatorMap[c.created_by] ?? 'Unknown',
        member_count:     memberCount,
        total_pool:       totalPool,
        payment_progress: progress,
      };
    });

    return { data: enriched, error: null };
  }

  /**
   * Force-closes a committee by setting its status to 'Completed'.
   */
  async closeCommittee(committeeId: string): Promise<{ error: string | null }> {
    const { error } = await this.supabase
      .from('committees')
      .update({ status: 'Completed' })
      .eq('id', committeeId);

    if (error) return { error: this.rlsHint('committees', 'UPDATE', error.message) };
    return { error: null };
  }

  /**
   * Permanently deletes a committee and all its member records.
   * Requires the DELETE RLS policy to be set on the committees table.
   */
  async deleteCommittee(committeeId: string): Promise<{ error: string | null }> {
    // Delete members first (foreign key constraint)
    const { error: membersErr } = await this.supabase
      .from('committee_members')
      .delete()
      .eq('committee_id', committeeId);

    if (membersErr) {
      return { error: this.rlsHint('committee_members', 'DELETE', membersErr.message) };
    }

    const { error } = await this.supabase
      .from('committees')
      .delete()
      .eq('id', committeeId);

    if (error) {
      return { error: this.rlsHint('committees', 'DELETE', error.message) };
    }
    return { error: null };
  }

  /**
   * Returns all members of a specific committee (all statuses).
   */
  async getCommitteeMembers(committeeId: string): Promise<{ data: CommitteeMember[]; error: string | null }> {
    const { data, error } = await this.supabase
      .from('committee_members')
      .select('*')
      .eq('committee_id', committeeId)
      .order('joined_at', { ascending: true });

    if (error) return { data: [], error: error.message };
    return { data: (data ?? []) as CommitteeMember[], error: null };
  }

  /**
   * Removes a specific member from a committee by deleting their row.
   */
  async removeMember(committeeId: string, memberId: string): Promise<{ error: string | null }> {
    const { error } = await this.supabase
      .from('committee_members')
      .delete()
      .eq('id', memberId)
      .eq('committee_id', committeeId);

    if (error) return { error: this.rlsHint('committee_members', 'DELETE', error.message) };
    return { error: null };
  }

  // ── Reports ───────────────────────────────────────────────────────────────

  /**
   * Returns all reports from the `reports` table, ordered newest first.
   * If the table doesn't exist, returns a special sentinel so the UI
   * can show a "create table" prompt instead of a generic error.
   */
  async getReports(): Promise<{ data: AdminReport[]; error: string | null; tableNotFound?: boolean }> {
    const { data, error } = await this.supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      // PostgREST error code for "relation does not exist" is PGRST200 or message contains schema cache
      const isNotFound =
        error.message.includes('does not exist') ||
        error.message.includes('schema cache') ||
        (error as any).code === 'PGRST200' ||
        (error as any).code === '42P01';

      if (isNotFound) {
        return { data: [], error: null, tableNotFound: true };
      }
      return { data: [], error: error.message };
    }

    const reports: AdminReport[] = (data ?? []).map((r: any) => ({
      id:            r.id,
      case_id:       r.case_id ?? `#TC-${r.id.slice(0, 5).toUpperCase()}`,
      reporter_name: r.reporter_name ?? 'Unknown',
      target_name:   r.target_name ?? 'Unknown',
      description:   r.description ?? '',
      severity:      r.severity ?? 'low',
      status:        r.status ?? 'open',
      created_at:    r.created_at,
    }));

    return { data: reports, error: null, tableNotFound: false };
  }

  /**
   * Marks a report as resolved.
   */
  async resolveReport(reportId: string): Promise<{ error: string | null }> {
    const { error } = await this.supabase
      .from('reports')
      .update({ status: 'resolved' })
      .eq('id', reportId);

    if (error) return { error: error.message };
    return { error: null };
  }

  /**
   * Marks a report as ignored/dismissed.
   */
  async ignoreReport(reportId: string): Promise<{ error: string | null }> {
    const { error } = await this.supabase
      .from('reports')
      .update({ status: 'ignored' })
      .eq('id', reportId);

    if (error) return { error: error.message };
    return { error: null };
  }

  // ── Style helpers ─────────────────────────────────────────────────────────

  getTrustScoreStyle(score: number): { color: string; bg: string; label: string } {
    if (score >= 80) return { color: '#15803d', bg: '#f0fdf4', label: 'High Trust' };
    if (score >= 50) return { color: '#854d0e', bg: '#fef9c3', label: 'Moderate' };
    if (score >= 25) return { color: '#c2410c', bg: '#fff7ed', label: 'At Risk' };
    return { color: '#ba1a1a', bg: '#ffdad6', label: 'Compromised' };
  }

  getUserStatusStyle(status: string): { color: string; bg: string; border: string } {
    switch (status) {
      case 'active':    return { color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' };
      case 'pending':   return { color: '#854d0e', bg: '#fef9c3', border: '#fde68a' };
      case 'suspended': return { color: '#ba1a1a', bg: '#ffdad6', border: '#fca5a5' };
      default:          return { color: '#434655', bg: '#f2f4f6', border: '#c3c6d7' };
    }
  }

  getCommitteeStatusStyle(status: string): { color: string; bg: string; border: string } {
    switch (status) {
      case 'Active':     return { color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' };
      case 'Recruiting': return { color: '#854d0e', bg: '#fef9c3', border: '#fde68a' };
      case 'Completed':  return { color: '#475569', bg: '#f8fafc', border: '#e2e8f0' };
      default:           return { color: '#434655', bg: '#f2f4f6', border: '#c3c6d7' };
    }
  }

  getSeverityStyle(severity: string): { color: string; bg: string } {
    switch (severity) {
      case 'high':   return { color: '#ba1a1a', bg: '#ffdad6' };
      case 'medium': return { color: '#854d0e', bg: '#fef9c3' };
      case 'low':    return { color: '#475569', bg: '#f1f5f9' };
      default:       return { color: '#434655', bg: '#f2f4f6' };
    }
  }

  formatCurrency(amount: number): string {
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000)     return `$${(amount / 1_000).toFixed(0)}K`;
    return `$${amount.toLocaleString()}`;
  }
}

// NOTE: rlsHint is defined inline in each method above.
// The formatCurrency dollar sign was added in the method bodies.
