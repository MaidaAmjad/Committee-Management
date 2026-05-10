import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SidebarComponent } from '../../shared/sidebar/sidebar';
import { TopnavComponent } from '../../shared/topnav/topnav';
import { CommitteeService, Committee } from '../../core/committee.service';
import { AuthService } from '../../core/auth.service';
import { SupabaseService } from '../../core/supabase.service';
import { ReviewService } from '../../core/review.service';

export interface ActivityItem {
  icon: string;
  iconBg: string;
  iconColor: string;
  message: string;
  time: string;
}

export interface CommitteeCard {
  id: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  name: string;
  description: string;
  monthly_amount: number;
  status: string;
  member_count: number;
}

export interface SuggestedCommittee {
  id: string;
  image: string;
  name: string;
  description: string;
  monthly_amount: number;
  max_members: number;
  slots_used: number;
}

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, SidebarComponent, TopnavComponent],
  templateUrl: './user-dashboard.html',
  styleUrl: './user-dashboard.scss'
})
export class UserDashboardComponent implements OnInit {
  trustScore = signal(95);
  trustDashOffset = signal(22); // 440 * (1 - 0.95) = 22
  loading = signal(true);
  errorMsg = signal('');

  stats = signal([
    { label: 'My Committees', value: '0', icon: 'groups', bg: '#dbe1ff', iconColor: '#00174b' },
    { label: 'Completed', value: '0', icon: 'verified', bg: '#d3e4fe', iconColor: '#0b1c30' },
    { label: 'Total Pool', value: 'Rs. 0', icon: 'payments', bg: '#ffdbcd', iconColor: '#360f00' },
  ]);

  myCommittees = signal<CommitteeCard[]>([]);
  suggestedCommittees = signal<SuggestedCommittee[]>([]);

  activityItems = signal<ActivityItem[]>([
    { icon: 'info', iconBg: '#dbe1ff', iconColor: '#004ac6', message: 'Welcome to TrustCom! Start by browsing committees or creating your own.', time: 'Just now' },
  ]);

  private supabase;

  constructor(
    private committeeService: CommitteeService,
    private auth: AuthService,
    private router: Router,
    private supabaseService: SupabaseService,
    private reviewService: ReviewService
  ) {
    this.supabase = this.supabaseService.client;
  }

  async ngOnInit(): Promise<void> {
    await this.auth.ready;
    await this.loadDashboardData();
    await this.loadActivityFeed();
    // Load real trust score
    const user = this.auth.user();
    if (user) {
      const score = await this.reviewService.getTrustScore(user.id);
      this.trustScore.set(score);
      // 440 * (1 - score/100)
      this.trustDashOffset.set(Math.round(440 * (1 - score / 100)));
    }
  }

  private async loadActivityFeed(): Promise<void> {
    const user = this.auth.user();
    if (!user) return;

    // Get all committees the user is a member of (any status)
    const { data: memberships } = await this.supabase
      .from('committee_members')
      .select('committee_id')
      .eq('user_id', user.id);

    // Also get committees the user created
    const { data: created } = await this.supabase
      .from('committees')
      .select('id')
      .eq('created_by', user.id);

    const committeeIds = new Set<string>([
      ...(memberships || []).map((m: any) => m.committee_id),
      ...(created || []).map((c: any) => c.id),
    ]);

    if (committeeIds.size === 0) return;

    // Fetch all messages from those committees, newest first, limit 20
    const { data: messages } = await this.supabase
      .from('committee_messages')
      .select('id, message, sender_name, created_at, committee_id, committees(name)')
      .in('committee_id', [...committeeIds])
      .order('created_at', { ascending: false })
      .limit(20);

    if (!messages || messages.length === 0) return;

    const items: ActivityItem[] = messages.map((m: any) => {
      const { icon, iconBg, iconColor } = this.getActivityStyle(m.sender_name, m.message);
      return {
        icon,
        iconBg,
        iconColor,
        message: `<span class="font-semibold">${m.committees?.name ?? 'Committee'}</span> — ${m.message}`,
        time: this.formatTime(m.created_at),
      };
    });

    this.activityItems.set(items);
  }

  private getActivityStyle(senderName: string, message: string): { icon: string; iconBg: string; iconColor: string } {
    if (message.includes('Winner') || message.includes('winner')) {
      return { icon: 'emoji_events', iconBg: '#fff7ed', iconColor: '#943700' };
    }
    if (message.includes('Completed') || message.includes('completed')) {
      return { icon: 'celebration', iconBg: '#f0fdf4', iconColor: '#16a34a' };
    }
    if (message.includes('deadline') || message.includes('payment')) {
      return { icon: 'payments', iconBg: '#fef9c3', iconColor: '#854d0e' };
    }
    if (senderName.includes('System') || senderName.includes('system')) {
      return { icon: 'notifications', iconBg: '#dbe1ff', iconColor: '#004ac6' };
    }
    return { icon: 'campaign', iconBg: '#dbe1ff', iconColor: '#004ac6' };
  }

  private formatTime(isoString: string): string {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  private async loadDashboardData(): Promise<void> {
    this.loading.set(true);
    this.errorMsg.set('');

    try {
      // Load user's committees (both created and joined)
      const [myCreatedRes, myJoinedRes] = await Promise.all([
        this.committeeService.getMyCommittees(),
        this.committeeService.getJoinedCommittees()
      ]);

      if (myCreatedRes.error) {
        this.errorMsg.set(myCreatedRes.error);
        this.loading.set(false);
        return;
      }

      // Combine created and joined committees
      const allMyCommittees = [...myCreatedRes.data, ...myJoinedRes.data];

      // Transform to CommitteeCard format
      const committeeCards: CommitteeCard[] = allMyCommittees.map((c: Committee) => ({
        id: c.id,
        icon: this.getCommitteeIcon(c.name),
        iconBg: 'rgba(0,74,198,0.1)',
        iconColor: '#004ac6',
        name: c.name,
        description: c.description || 'No description',
        monthly_amount: c.monthly_amount,
        status: c.status,
        member_count: c.member_count || 0
      }));

      this.myCommittees.set(committeeCards);

      // Load suggested committees (all committees user hasn't joined)
      const { data: allCommittees, error: allError } = await this.committeeService.getAllCommittees();
      if (!allError && allCommittees) {
        const myCommitteeIds = new Set(allMyCommittees.map((c: Committee) => c.id));
        const suggested = allCommittees
          .filter((c: Committee) => !myCommitteeIds.has(c.id) && c.status === 'Recruiting')
          .slice(0, 3)
          .map((c: Committee) => ({
            id: c.id,
            image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB9QbmJvUwsmME2kL7n_-hTA5AM-5vHREfOAPsh2gGyaqg47FZL7HyrP0mA2OWPXUfMOUR0Pz9_ao8X3MPhiJ22lXeWD_skrkECjDqpY_Ndth55h5G3b8xY6SLXeUPhdZFS4j9Yo_qunQ44cWptmOaBcie8lk48SIjbc6P8zNwtZLkl18cUf2UD-6V64foUPOhbGUBFhRw0RU4yjAQtRRHNjw1X9r6LTMPFUsa8WBmQER5NlyfHgfo55LnbPy0C42KwLCXvaJwa3Lc',
            name: c.name,
            description: c.description || 'Join this committee',
            monthly_amount: c.monthly_amount,
            max_members: c.max_members,
            slots_used: c.slots_used || 0
          }));
        this.suggestedCommittees.set(suggested);
      }

      // Update stats — count all committees user is part of
      const activeCount = allMyCommittees.filter(
        (c: Committee) => c.status === 'Active' || c.status === 'Recruiting'
      ).length;
      const completedCount = allMyCommittees.filter(
        (c: Committee) => c.status === 'Completed'
      ).length;
      // Total pool = sum of (monthly_amount × max_members × duration) for ALL committees
      const totalPool = allMyCommittees.reduce(
        (sum: number, c: Committee) => sum + (c.monthly_amount * c.max_members * (c.duration_months || 1)), 0
      );

      console.log('📊 Dashboard stats:', { activeCount, completedCount, totalPool, allMyCommittees });

      this.stats.set([
        { label: 'My Committees', value: activeCount.toString(), icon: 'groups', bg: '#dbe1ff', iconColor: '#00174b' },
        { label: 'Completed', value: completedCount.toString(), icon: 'verified', bg: '#d3e4fe', iconColor: '#0b1c30' },
        { label: 'Total Pool', value: `Rs. ${totalPool.toLocaleString()}`, icon: 'payments', bg: '#ffdbcd', iconColor: '#360f00' },
      ]);

    } catch (error) {
      console.error('Error loading dashboard:', error);
      this.errorMsg.set('Failed to load dashboard data');
    } finally {
      this.loading.set(false);
    }
  }

  private getCommitteeIcon(name: string): string {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('tech') || nameLower.includes('ai')) return 'computer';
    if (nameLower.includes('audit') || nameLower.includes('finance')) return 'account_balance';
    if (nameLower.includes('dev') || nameLower.includes('urban')) return 'apartment';
    if (nameLower.includes('budget')) return 'payments';
    if (nameLower.includes('strategic') || nameLower.includes('planning')) return 'corporate_fare';
    return 'groups';
  }

  viewCommittee(id: string): void {
    this.router.navigate(['/committee', id]);
  }

  goToBrowse(): void {
    this.router.navigate(['/browse']);
  }

  goToCreate(): void {
    this.router.navigate(['/create-committee']);
  }
}
