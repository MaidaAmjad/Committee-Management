import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-verified-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (status === 'approved') {
      <span title="Verified User"
        class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#1d4ed8] flex-shrink-0"
        [class.w-5]="size === 'md'"
        [class.h-5]="size === 'md'"
        [class.w-6]="size === 'lg'"
        [class.h-6]="size === 'lg'">
        <svg viewBox="0 0 24 24" fill="white"
          [attr.width]="size === 'sm' ? 10 : size === 'md' ? 12 : 14"
          [attr.height]="size === 'sm' ? 10 : size === 'md' ? 12 : 14">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
      </span>
    }
    @if (status === 'pending') {
      <span title="Verification Pending"
        class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#d97706] flex-shrink-0">
        <svg viewBox="0 0 24 24" fill="white" width="10" height="10">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
      </span>
    }
  `
})
export class VerifiedBadgeComponent {
  @Input() status: 'none' | 'pending' | 'approved' | 'rejected' = 'none';
  @Input() size: 'sm' | 'md' | 'lg' = 'sm';
}
