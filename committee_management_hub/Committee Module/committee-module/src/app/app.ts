import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/auth.service';
import { NotificationService } from './core/notification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  template: `
    <router-outlet></router-outlet>

    <!-- Global Broadcast Popup -->
    @if (notificationService.currentPopup()) {
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-[#c3c6d7] overflow-hidden animate-fade-in">

          <!-- Header -->
          <div class="bg-gradient-to-r from-[#004ac6] to-[#2563eb] px-6 py-4 flex items-center gap-3">
            <div class="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined text-white text-[20px]">campaign</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-white font-bold text-sm">New Announcement</p>
              <p class="text-white/70 text-xs truncate">{{ notificationService.currentPopup()!.committee_name }}</p>
            </div>
            @if (notificationService.pendingPopups().length > 1) {
              <span class="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                {{ notificationService.pendingPopups().length }} unread
              </span>
            }
          </div>

          <!-- Body -->
          <div class="px-6 py-5">
            <div class="flex items-center gap-2 mb-3">
              <div class="w-7 h-7 rounded-full bg-[#004ac6] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {{ getInitials(notificationService.currentPopup()!.sender_name) }}
              </div>
              <div>
                <span class="text-xs font-bold text-[#191c1e]">{{ notificationService.currentPopup()!.sender_name }}</span>
                <span class="text-xs text-[#737686] ml-2">{{ notificationService.currentPopup()!.created_at | date:'MMM d · h:mm a' }}</span>
              </div>
            </div>
            <p class="text-sm text-[#191c1e] leading-relaxed bg-[#f7f9fb] rounded-xl p-4 border border-[#f2f4f6]">
              {{ notificationService.currentPopup()!.message }}
            </p>
          </div>

          <!-- Footer -->
          <div class="px-6 pb-5 flex gap-3">
            <button
              (click)="notificationService.dismissPopup()"
              class="flex-1 h-11 bg-[#004ac6] text-white text-sm font-semibold rounded-xl hover:bg-[#2563eb] transition-all flex items-center justify-center gap-2">
              <span class="material-symbols-outlined text-[18px]">check</span>
              OK, Got it
            </button>
            @if (notificationService.pendingPopups().length > 1) {
              <button
                (click)="notificationService.markAllRead()"
                class="h-11 px-4 bg-white border border-[#c3c6d7] text-[#434655] text-sm font-semibold rounded-xl hover:bg-[#f2f4f6] transition-all">
                Dismiss All
              </button>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes fade-in {
      from { opacity: 0; transform: scale(0.95); }
      to   { opacity: 1; transform: scale(1); }
    }
    .animate-fade-in { animation: fade-in 0.2s ease-out; }
  `]
})
export class App implements OnInit {
  title = 'committee-module';

  constructor(
    private auth: AuthService,
    public notificationService: NotificationService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.auth.ready;
    if (this.auth.isLoggedIn) {
      await this.notificationService.loadUnread();
    }
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
}
