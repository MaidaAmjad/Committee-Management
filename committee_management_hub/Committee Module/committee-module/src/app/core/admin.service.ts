import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { Committee, CommitteeMember } from './committee.service';
import { AdminAuthService } from './admin-auth.service';
import { environment } from '../../environments/environment';
import { apiReachabilityHint, apiUrl, getApiOrigin } from './api-url';

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
  payment_progress: number;
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

  constructor(
    private supabaseService: SupabaseService,
    private http: HttpClient,
    private adminAuth: AdminAuthService
  ) {
    this.supabase = this.supabaseService.client;
  }

  private async postAdminApi(path: string, body: Record<string, unknown> = {}): Promise<{ error: string | null }> {
    const creds = this.adminAuth.getApiAuthBody();
    if (!creds) {
      return { error: 'Admin session expired. Sign in to the admin portal again.' };
    }
    if (environment.production && !getApiOrigin()) {
      return { error: 'Auth API is not configured. Start the server (cd server && npm run dev) to suspend users.' };
    }

    try {
      await firstValueFrom(
        this.http.post(apiUrl(`/api/admin${path}`), {
          ...body,
          ...creds,
        })
      );
      return { error: null };
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse) {
        const msg = err.error?.message;
        if (typeof msg === 'string' && msg) return { error: msg };
        if (err.status === 0) {
          return { error: `Cannot reach API (${apiReachabilityHint()}). Start the server with: cd server && npm run dev` };
        }
      }
      if (err instanceof Error && err.message) return { error: err.message };
      return { error: 'Admin action failed. Check the API server and try again.' };
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Wraps a Supabase error message with a helpful RLS hint when the error
   * looks like a permission denial. RLS blocks often return empty errors.
   */
  private rlsError(table: string, op: string, msg: string): string {
    const isRls =
      msg.includes('permission denied') ||
      msg.includes('violates row-level security') ||
      msg.includes('new row violates') ||
      msg === '';
    if (isRls) {
      return `RLS blocked ${op} on "${table}". Run the admin SQL migration shown in the setup banner above.`;
    }
    return msg;
  }

  /**
   * Verifies a DELETE actually removed a row by re-querying the table.
   * Supabase with RLS silently returns no error but deletes 0 rows.
   * Returns an error string if the row still exists after deletion.
   */
  private async verifyDeleted(table: string, id: string): Promise<string | null> {
    const { data } = await this.supabase
      .from(table)
      .select('id')
      .eq('id', id)
      .maybeSingle();
    if (data) {
      return `Delete was blocked by RLS on "${table}". Run the admin SQL migration shown in the setup banner to grant delete permissions.`;
    }
    return null;
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  async getStats(): Promise<{ data: AdminStats; error: string | null }> {
    const [usersRes, suspendedRes, completedRes, pendingRes, committeesRes] = await Promise.all([
      this.supabase.from('profiles').select('*', { count: 'exact', head: true }),
      this.supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_suspended', true),
      this.supabase.from('committees').select('*', { count: 'exact', head: true }).eq('status', 'Completed'),
      this.supabase.from('committee_members').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      this.supabase.from('committees').select('monthly_amount, max_members, duration_months, status'),
    ]);

    const committees = (committeesRes.data ?? []) as any[];

    // Count non-completed committees as "active"
    const activeCount = committees.filter(
      (c: any) => c.status !== 'Completed'
    ).length;

    const totalCapital = committees.reduce(
      (sum: number, c: any) => sum + (c.monthly_amount ?? 0) * (c.max_members ?? 0) * (c.duration_months ?? 0),
      0
    );

    return {
      data: {
        totalUsers:          usersRes.count ?? 0,
        activeCommittees:    activeCount,
        completedCommittees: completedRes.count ?? 0,
        totalCapital,
        pendingRequests:     pendingRes.count ?? 0,
        suspendedUsers:      suspendedRes.count ?? 0,
      },
      error: null,
    };
  }

  // ── Users ─────────────────────────────────────────────────────────────────

  async getAllUsers(): Promise<{ data: AdminUser[]; error: string | null }> {
    const { data: profiles, error: profileErr } = await this.supabase
      .from('profiles')
      .select('id, full_name, email, created_at, payment_setup_complete, trust_score, is_suspended')
      .order('created_at', { ascending: false });

    if (profileErr) return { data: [], error: profileErr.message };
    if (!profiles?.length) return { data: [], error: null };

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
      trust_score:            p.trust_score ?? 0,
      status:                 p.is_suspended ? 'suspended' : (p.payment_setup_complete ? 'active' : 'pending'),
      committee_count:        countMap[p.id] ?? 0,
      created_at:             p.created_at,
      payment_setup_complete: p.payment_setup_complete ?? false,
    }));

    return { data: users, error: null };
  }

  async suspendUser(userId: string): Promise<{ error: string | null }> {
    if (!environment.production || getApiOrigin()) {
      return this.postAdminApi(`/users/${userId}/suspend`);
    }
    const { error } = await this.supabase
      .from('profiles')
      .update({ is_suspended: true } as any)
      .eq('id', userId);
    if (error) {
      if (error.message.includes('column') || (error as any).code === '42703') {
        return { error: 'Run database-migrations/add-user-suspension.sql in Supabase.' };
      }
      return { error: this.rlsError('profiles', 'UPDATE', error.message) };
    }
    return { error: null };
  }

  async reinstateUser(userId: string): Promise<{ error: string | null }> {
    if (!environment.production || getApiOrigin()) {
      return this.postAdminApi(`/users/${userId}/reinstate`);
    }
    const { error } = await this.supabase
      .from('profiles')
      .update({ is_suspended: false } as any)
      .eq('id', userId);
    if (error) {
      if (error.message.includes('column') || (error as any).code === '42703') {
        return { error: 'Run database-migrations/add-user-suspension.sql in Supabase.' };
      }
      return { error: this.rlsError('profiles', 'UPDATE', error.message) };
    }
    return { error: null };
  }

  /**
   * Deletes a user's profile and all their committee memberships.
   * Verifies the deletion actually happened — RLS silently blocks without error.
   */
  async deleteUser(userId: string): Promise<{ error: string | null }> {
    // Remove memberships first
    const { error: memErr } = await this.supabase
      .from('committee_members')
      .delete()
      .eq('user_id', userId);

    if (memErr) return { error: this.rlsError('committee_members', 'DELETE', memErr.message) };

    // Delete profile
    const { error } = await this.supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (error) return { error: this.rlsError('profiles', 'DELETE', error.message) };

    // Verify the row is actually gone (RLS silent block check)
    const verifyErr = await this.verifyDeleted('profiles', userId);
    if (verifyErr) return { error: verifyErr };

    return { error: null };
  }

  // ── Committees ────────────────────────────────────────────────────────────

  async getAllCommittees(): Promise<{ data: AdminCommittee[]; error: string | null }> {
    const { data: committees, error: cErr } = await this.supabase
      .from('committees')
      .select('*')
      .order('created_at', { ascending: false });

    if (cErr) return { data: [], error: cErr.message };
    if (!committees?.length) return { data: [], error: null };

    const { data: memberships } = await this.supabase
      .from('committee_members')
      .select('committee_id')
      .eq('status', 'approved');

    const memberCountMap: Record<string, number> = {};
    (memberships ?? []).forEach((m: any) => {
      memberCountMap[m.committee_id] = (memberCountMap[m.committee_id] ?? 0) + 1;
    });

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

  async closeCommittee(committeeId: string): Promise<{ error: string | null }> {
    const { error } = await this.supabase
      .from('committees')
      .update({ status: 'Completed' })
      .eq('id', committeeId);

    if (error) return { error: this.rlsError('committees', 'UPDATE', error.message) };

    // Verify the update actually applied
    const { data } = await this.supabase
      .from('committees')
      .select('status')
      .eq('id', committeeId)
      .maybeSingle();

    if (data && data.status !== 'Completed') {
      return { error: 'Update was blocked by RLS on "committees". Run the admin SQL migration shown in the setup banner.' };
    }
    return { error: null };
  }

  /**
   * Permanently deletes a committee and all its members.
   * Verifies deletion actually happened — RLS silently blocks without error.
   */
  async deleteCommittee(committeeId: string): Promise<{ error: string | null }> {
    // Delete members first (foreign key)
    const { error: membersErr } = await this.supabase
      .from('committee_members')
      .delete()
      .eq('committee_id', committeeId);

    if (membersErr) return { error: this.rlsError('committee_members', 'DELETE', membersErr.message) };

    // Delete committee
    const { error } = await this.supabase
      .from('committees')
      .delete()
      .eq('id', committeeId);

    if (error) return { error: this.rlsError('committees', 'DELETE', error.message) };

    // Verify the row is actually gone
    const verifyErr = await this.verifyDeleted('committees', committeeId);
    if (verifyErr) return { error: verifyErr };

    return { error: null };
  }

  async getCommitteeMembers(committeeId: string): Promise<{ data: CommitteeMember[]; error: string | null }> {
    const { data, error } = await this.supabase
      .from('committee_members')
      .select('*')
      .eq('committee_id', committeeId)
      .order('joined_at', { ascending: true });

    if (error) return { data: [], error: error.message };
    return { data: (data ?? []) as CommitteeMember[], error: null };
  }

  async removeMember(committeeId: string, memberId: string): Promise<{ error: string | null }> {
    const { error } = await this.supabase
      .from('committee_members')
      .delete()
      .eq('id', memberId)
      .eq('committee_id', committeeId);

    if (error) return { error: this.rlsError('committee_members', 'DELETE', error.message) };

    const verifyErr = await this.verifyDeleted('committee_members', memberId);
    if (verifyErr) return { error: verifyErr };

    return { error: null };
  }

  // ── Reports ───────────────────────────────────────────────────────────────

  async getReports(): Promise<{ data: AdminReport[]; error: string | null; tableNotFound?: boolean }> {
    const { data, error } = await this.supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      const isNotFound =
        error.message.includes('does not exist') ||
        error.message.includes('schema cache') ||
        (error as any).code === 'PGRST200' ||
        (error as any).code === '42P01';
      if (isNotFound) return { data: [], error: null, tableNotFound: true };
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

  async resolveReport(reportId: string): Promise<{ error: string | null }> {
    const { error } = await this.supabase
      .from('reports').update({ status: 'resolved' }).eq('id', reportId);
    if (error) return { error: error.message };
    return { error: null };
  }

  async ignoreReport(reportId: string): Promise<{ error: string | null }> {
    const { error } = await this.supabase
      .from('reports').update({ status: 'ignored' }).eq('id', reportId);
    if (error) return { error: error.message };
    return { error: null };
  }

  // ── Style helpers ─────────────────────────────────────────────────────────

  getTrustScoreStyle(score: number): { color: string; bg: string; label: string } {
    if (score <= 20) return { color: '#475569', bg: '#f1f5f9', label: 'New User' };
    if (score <= 40) return { color: '#ba1a1a', bg: '#ffdad6', label: 'Low Reliability' };
    if (score <= 60) return { color: '#854d0e', bg: '#fef9c3', label: 'Moderate' };
    if (score <= 80) return { color: '#15803d', bg: '#f0fdf4', label: 'Reliable' };
    return { color: '#065f46', bg: '#d1fae5', label: 'Highly Reliable' };
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
    if (amount >= 1_000_000) return `Rs. ${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000)     return `Rs. ${(amount / 1_000).toFixed(0)}K`;
    return `Rs. ${amount.toLocaleString()}`;
  }
}
