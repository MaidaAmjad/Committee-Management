import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class ReportDownloadService {
  private supabase;

  constructor(private supabaseService: SupabaseService) {
    this.supabase = this.supabaseService.client;
  }

  // ── Data fetchers ─────────────────────────────────────────────────────────

  async fetchUsersReport(): Promise<any[]> {
    const { data: profiles } = await this.supabase
      .from('profiles')
      .select('id, full_name, email, phone, trust_score, verification_status, is_verified, created_at')
      .order('created_at', { ascending: false });

    if (!profiles) return [];

    // Get committee counts per user
    const userIds = profiles.map((p: any) => p.id);
    const { data: memberships } = await this.supabase
      .from('committee_members')
      .select('user_id')
      .in('user_id', userIds)
      .eq('status', 'approved');

    const countMap: Record<string, number> = {};
    (memberships || []).forEach((m: any) => {
      countMap[m.user_id] = (countMap[m.user_id] || 0) + 1;
    });

    return profiles.map((p: any) => ({
      'User Name':            p.full_name || '—',
      'Email':                p.email || '—',
      'Phone Number':         p.phone || '—',
      'Trust Score':          `${p.trust_score ?? 0}%`,
      'Verification Status':  p.is_verified ? 'Verified' : (p.verification_status === 'pending' ? 'Pending' : 'Not Verified'),
      'Total Committees':     countMap[p.id] || 0,
      'Account Status':       'Active',
      'Member Since':         p.created_at ? new Date(p.created_at).toLocaleDateString() : '—',
    }));
  }

  async fetchCommitteesReport(): Promise<any[]> {
    const { data: committees } = await this.supabase
      .from('committees')
      .select('id, name, created_by, max_members, monthly_amount, duration_months, status, distribution_method, created_at')
      .order('created_at', { ascending: false });

    if (!committees) return [];

    // Get creator names
    const creatorIds = [...new Set(committees.map((c: any) => c.created_by))];
    const { data: creators } = await this.supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', creatorIds);

    const creatorMap: Record<string, string> = {};
    (creators || []).forEach((c: any) => { creatorMap[c.id] = c.full_name; });

    // Get member counts
    const committeeIds = committees.map((c: any) => c.id);
    const { data: members } = await this.supabase
      .from('committee_members')
      .select('committee_id')
      .in('committee_id', committeeIds)
      .eq('status', 'approved');

    const memberCountMap: Record<string, number> = {};
    (members || []).forEach((m: any) => {
      memberCountMap[m.committee_id] = (memberCountMap[m.committee_id] || 0) + 1;
    });

    return committees.map((c: any) => {
      const startDate = new Date(c.created_at);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + (c.duration_months || 0));
      return {
        'Committee Name':      c.name,
        'Committee Admin':     creatorMap[c.created_by] || '—',
        'Total Members':       memberCountMap[c.id] || 0,
        'Max Members':         c.max_members,
        'Monthly Amount':      `Rs. ${(c.monthly_amount || 0).toLocaleString()}`,
        'Status':              c.status,
        'Distribution Method': c.distribution_method === 'random' ? 'Random' : 'Manual',
        'Duration (months)':   c.duration_months,
        'Start Date':          startDate.toLocaleDateString(),
        'End Date':            endDate.toLocaleDateString(),
      };
    });
  }

  async fetchPaymentsReport(): Promise<any[]> {
    const { data: proofs } = await this.supabase
      .from('payment_proofs')
      .select('id, committee_id, uploader_id, uploader_name, file_name, status, month_year, created_at')
      .order('created_at', { ascending: false });

    if (!proofs) return [];

    // Get committee names
    const committeeIds = [...new Set(proofs.map((p: any) => p.committee_id))];
    const { data: committees } = await this.supabase
      .from('committees')
      .select('id, name, monthly_amount')
      .in('id', committeeIds);

    const committeeMap: Record<string, any> = {};
    (committees || []).forEach((c: any) => { committeeMap[c.id] = c; });

    // Get winner info per committee
    const { data: winners } = await this.supabase
      .from('winner_selections')
      .select('committee_id, member_name')
      .in('committee_id', committeeIds);

    const winnerMap: Record<string, string> = {};
    (winners || []).forEach((w: any) => { winnerMap[w.committee_id] = w.member_name; });

    return proofs.map((p: any) => {
      const committee = committeeMap[p.committee_id];
      return {
        'Sender Name':         p.uploader_name || '—',
        'Receiver (Winner)':   winnerMap[p.committee_id] || '—',
        'Committee Name':      committee?.name || '—',
        'Payment Amount':      `Rs. ${(committee?.monthly_amount || 0).toLocaleString()}`,
        'Payment Status':      p.status === 'accepted' ? 'Accepted' : p.status === 'rejected' ? 'Rejected' : 'Submitted',
        'Submission Date':     p.created_at ? new Date(p.created_at).toLocaleDateString() : '—',
        'Month/Year':          p.month_year || '—',
        'File Name':           p.file_name || '—',
        'Verification Status': p.status === 'accepted' ? 'Verified' : 'Pending',
      };
    });
  }

  async fetchCommitteePaymentDetails(committeeId: string): Promise<{ rows: any[]; committeeName: string }> {
    // Get committee info
    const { data: committee } = await this.supabase
      .from('committees')
      .select('name, monthly_amount')
      .eq('id', committeeId)
      .single();

    // Get all members
    const { data: members } = await this.supabase
      .from('committee_members')
      .select('user_id, full_name, email, status, joined_at')
      .eq('committee_id', committeeId)
      .eq('status', 'approved');

    if (!members) return { rows: [], committeeName: committee?.name || '' };

    // Get payment proofs for this committee
    const { data: proofs } = await this.supabase
      .from('payment_proofs')
      .select('uploader_id, status, created_at, month_year, file_name')
      .eq('committee_id', committeeId)
      .order('created_at', { ascending: false });

    // Map latest proof per user
    const proofMap: Record<string, any> = {};
    (proofs || []).forEach((p: any) => {
      if (!proofMap[p.uploader_id]) proofMap[p.uploader_id] = p;
    });

    const rows = members.map((m: any) => {
      const proof = proofMap[m.user_id];
      const isLate = proof ? (() => {
        const submitted = new Date(proof.created_at);
        const monthYear = proof.month_year?.split('-');
        if (!monthYear) return false;
        const deadline = new Date(parseInt(monthYear[0]), parseInt(monthYear[1]) - 1, 10);
        return submitted > deadline;
      })() : false;

      return {
        'Member Name':       m.full_name,
        'Email':             m.email,
        'Payment Amount':    `Rs. ${(committee?.monthly_amount || 0).toLocaleString()}`,
        'Payment Status':    proof ? (proof.status === 'accepted' ? 'Paid' : proof.status === 'rejected' ? 'Rejected' : 'Submitted') : 'Unpaid',
        'Submission Date':   proof?.created_at ? new Date(proof.created_at).toLocaleDateString() : '—',
        'Month/Year':        proof?.month_year || '—',
        'Late Payment':      isLate ? 'Yes' : 'No',
        'Proof Status':      proof?.status ? (proof.status.charAt(0).toUpperCase() + proof.status.slice(1)) : 'No Proof',
        'File Name':         proof?.file_name || '—',
      };
    });

    return { rows, committeeName: committee?.name || '' };
  }

  async getAllCommittees(): Promise<{ id: string; name: string }[]> {
    const { data } = await this.supabase
      .from('committees')
      .select('id, name')
      .order('name');
    return (data || []) as { id: string; name: string }[];
  }

  // ── Export helpers ────────────────────────────────────────────────────────

  downloadCSV(data: any[], filename: string): void {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row =>
        headers.map(h => {
          const val = String(row[h] ?? '').replace(/"/g, '""');
          return `"${val}"`;
        }).join(',')
      )
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    this.triggerDownload(blob, `${filename}.csv`);
  }

  downloadPDF(data: any[], filename: string, title: string): void {
    if (!data.length) return;
    const headers = Object.keys(data[0]);

    // Build HTML table for PDF
    const tableRows = data.map(row =>
      `<tr>${headers.map(h => `<td>${row[h] ?? ''}</td>`).join('')}</tr>`
    ).join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; margin: 20px; }
    h1 { font-size: 18px; color: #0058be; margin-bottom: 4px; }
    p { color: #64748b; font-size: 10px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #0058be; color: white; padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) td { background: #f8fafc; }
    .footer { margin-top: 20px; font-size: 9px; color: #94a3b8; text-align: right; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>Generated on ${new Date().toLocaleString()} · TrustCom Admin Portal</p>
  <table>
    <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
  <div class="footer">TrustCom · Confidential · ${new Date().toLocaleDateString()}</div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    this.triggerDownload(blob, `${filename}.html`);
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
