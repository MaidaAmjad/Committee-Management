import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export const ADMIN_RLS_SQL = `-- ============================================================
-- TrustCom Admin RLS Migration
-- Run this ONCE in: Supabase Dashboard → SQL Editor → New Query
-- https://supabase.com/dashboard/project/lvinxglqpdrljtqwuqrm/sql/new
-- ============================================================

-- 1. COMMITTEES: allow admin to update and delete any committee
DROP POLICY IF EXISTS "Admin can update committees" ON public.committees;
CREATE POLICY "Admin can update committees"
  ON public.committees FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin can delete committees" ON public.committees;
CREATE POLICY "Admin can delete committees"
  ON public.committees FOR DELETE USING (true);

-- 2. COMMITTEE_MEMBERS: allow admin to delete any member row
DROP POLICY IF EXISTS "Admin can delete members" ON public.committee_members;
CREATE POLICY "Admin can delete members"
  ON public.committee_members FOR DELETE USING (true);

-- 3. PROFILES: allow admin to update and delete any profile
DROP POLICY IF EXISTS "Admin can update profiles" ON public.profiles;
CREATE POLICY "Admin can update profiles"
  ON public.profiles FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin can delete profiles" ON public.profiles;
CREATE POLICY "Admin can delete profiles"
  ON public.profiles FOR DELETE USING (true);

-- 4. (Optional) Add is_suspended column if it doesn't exist yet
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;`;

@Component({
  selector: 'app-admin-setup-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-[#1e293b] border border-[#334155] rounded-2xl overflow-hidden mb-6">
      <!-- Header -->
      <div class="flex items-center justify-between px-5 py-4 border-b border-[#334155]">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-[#fef3c7] rounded-lg flex items-center justify-center flex-shrink-0">
            <span class="material-symbols-outlined text-[#d97706] text-[18px]">build</span>
          </div>
          <div>
            <p class="text-white text-sm font-bold">One-time setup required</p>
            <p class="text-[#64748b] text-xs">Run this SQL in Supabase to enable admin write operations (delete, update, suspend)</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button (click)="openEditor()"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-[#0058be] text-white text-xs font-semibold rounded-lg hover:bg-[#1d4ed8] transition-all">
            <span class="material-symbols-outlined text-[14px]">open_in_new</span>
            Open SQL Editor
          </button>
          <button (click)="copySql()"
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all"
            [class.bg-[#d1fae5]]="copied()"
            [class.text-[#15803d]]="copied()"
            [class.border-[#bbf7d0]]="copied()"
            [class.bg-[#0f172a]]="!copied()"
            [class.text-[#94a3b8]]="!copied()"
            [class.border-[#334155]]="!copied()">
            <span class="material-symbols-outlined text-[14px]">{{ copied() ? 'check' : 'content_copy' }}</span>
            {{ copied() ? 'Copied!' : 'Copy SQL' }}
          </button>
          <button (click)="dismissed.set(true)"
            class="p-1.5 text-[#475569] hover:text-[#94a3b8] transition-colors rounded-lg hover:bg-[#334155]">
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      </div>

      <!-- SQL block (collapsible) -->
      @if (!dismissed()) {
        <div class="px-5 py-4">
          <pre class="text-[#94a3b8] text-[11px] font-mono leading-relaxed overflow-x-auto whitespace-pre bg-[#0f172a] rounded-xl p-4 max-h-48 overflow-y-auto">{{ sql }}</pre>
        </div>
      }
    </div>
  `,
})
export class AdminSetupBannerComponent {
  sql = ADMIN_RLS_SQL;
  copied   = signal(false);
  dismissed = signal(false);

  copySql(): void {
    navigator.clipboard.writeText(this.sql).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  openEditor(): void {
    window.open('https://supabase.com/dashboard/project/lvinxglqpdrljtqwuqrm/sql/new', '_blank');
  }
}
