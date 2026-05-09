import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminSidebarComponent } from '../../../shared/admin-sidebar/admin-sidebar';
import { AdminService, AdminReport } from '../../../core/admin.service';

const SETUP_SQL = `-- Run this once in your Supabase SQL Editor
-- https://supabase.com/dashboard/project/lvinxglqpdrljtqwuqrm/sql/new

CREATE TABLE IF NOT EXISTS public.reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id       text,
  reporter_name text NOT NULL,
  target_name   text NOT NULL,
  description   text NOT NULL,
  severity      text NOT NULL DEFAULT 'low'
                CHECK (severity IN ('high', 'medium', 'low')),
  status        text NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'resolved', 'ignored')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reports"
  ON public.reports FOR SELECT USING (true);

CREATE POLICY "Anyone can insert reports"
  ON public.reports FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update reports"
  ON public.reports FOR UPDATE USING (true);`;

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSidebarComponent],
  templateUrl: './admin-reports.html',
})
export class AdminReportsComponent implements OnInit {
  allReports     = signal<AdminReport[]>([]);
  loading        = signal(true);
  errorMsg       = signal('');
  tableNotFound  = signal(false);
  sqlCopied      = signal(false);
  statusFilter   = signal<'all' | 'open' | 'resolved' | 'ignored'>('all');
  severityFilter = signal<'all' | 'high' | 'medium' | 'low'>('all');

  readonly setupSql = SETUP_SQL;

  filteredReports = computed(() => {
    const sf = this.statusFilter();
    const sv = this.severityFilter();
    return this.allReports().filter(r =>
      (sf === 'all' || r.status === sf) &&
      (sv === 'all' || r.severity === sv)
    );
  });

  constructor(private adminService: AdminService) {}

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    const result = await this.adminService.getReports();
    this.loading.set(false);

    if (result.tableNotFound) {
      this.tableNotFound.set(true);
      return;
    }
    if (result.error) { this.errorMsg.set(result.error); return; }
    this.allReports.set(result.data);
  }

  async resolveReport(report: AdminReport): Promise<void> {
    const { error } = await this.adminService.resolveReport(report.id);
    if (error) { this.errorMsg.set(error); return; }
    this.allReports.update(list => list.map(r => r.id === report.id ? { ...r, status: 'resolved' as const } : r));
  }

  async ignoreReport(report: AdminReport): Promise<void> {
    const { error } = await this.adminService.ignoreReport(report.id);
    if (error) { this.errorMsg.set(error); return; }
    this.allReports.update(list => list.map(r => r.id === report.id ? { ...r, status: 'ignored' as const } : r));
  }

  copySql(): void {
    navigator.clipboard.writeText(this.setupSql).then(() => {
      this.sqlCopied.set(true);
      setTimeout(() => this.sqlCopied.set(false), 2000);
    });
  }

  openSupabaseSqlEditor(): void {
    window.open('https://supabase.com/dashboard/project/lvinxglqpdrljtqwuqrm/sql/new', '_blank');
  }

  getSeverityStyle(s: string) { return this.adminService.getSeverityStyle(s); }

  getStatusStyle(status: string): { color: string; bg: string } {
    switch (status) {
      case 'open':     return { color: '#ba1a1a', bg: '#ffdad6' };
      case 'resolved': return { color: '#15803d', bg: '#f0fdf4' };
      case 'ignored':  return { color: '#475569', bg: '#f1f5f9' };
      default:         return { color: '#434655', bg: '#f2f4f6' };
    }
  }

  timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  get stats() {
    const rs = this.allReports();
    return {
      open:     rs.filter(r => r.status === 'open').length,
      resolved: rs.filter(r => r.status === 'resolved').length,
      high:     rs.filter(r => r.severity === 'high').length,
    };
  }
}
