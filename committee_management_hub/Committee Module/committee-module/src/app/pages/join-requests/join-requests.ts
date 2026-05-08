import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SidebarComponent } from '../../shared/sidebar/sidebar';
import { TopnavComponent } from '../../shared/topnav/topnav';
import { CommitteeService, CommitteeMember } from '../../core/committee.service';
import { AuthService } from '../../core/auth.service';

type RequestWithCommittee = CommitteeMember & { committee_name: string };

@Component({
  selector: 'app-join-requests',
  standalone: true,
  imports: [CommonModule, RouterLink, SidebarComponent, TopnavComponent],
  templateUrl: './join-requests.html',
  styleUrl: './join-requests.scss'
})
export class JoinRequestsComponent implements OnInit {
  requests   = signal<RequestWithCommittee[]>([]);
  loading    = signal(true);
  actionId   = signal<string | null>(null);
  errorMsg   = signal('');

  constructor(
    private committeeService: CommitteeService,
    private auth: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.auth.ready;
    await this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    const { data, error } = await this.committeeService.getPendingRequests();
    this.loading.set(false);
    if (error) { this.errorMsg.set(error); return; }
    this.requests.set(data);
  }

  async approve(req: RequestWithCommittee): Promise<void> {
    this.actionId.set(req.id);
    const { error } = await this.committeeService.approveRequest(req.id);
    this.actionId.set(null);
    if (error) { this.errorMsg.set(error); return; }
    this.requests.update(list => list.filter(r => r.id !== req.id));
  }

  async reject(req: RequestWithCommittee): Promise<void> {
    this.actionId.set(req.id);
    const { error } = await this.committeeService.rejectRequest(req.id);
    this.actionId.set(null);
    if (error) { this.errorMsg.set(error); return; }
    this.requests.update(list => list.filter(r => r.id !== req.id));
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
}
