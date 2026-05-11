import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GuestGuardService } from '../../core/guest-guard.service';

@Component({
  selector: 'app-sign-in-popup',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (guestGuard.showSignInPopup()) {
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
        (click)="guestGuard.dismissPopup()">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-[#c3c6d7] overflow-hidden"
          (click)="$event.stopPropagation()">

          <!-- Header -->
          <div class="bg-gradient-to-r from-[#004ac6] to-[#2563eb] px-6 py-8 text-center">
            <div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span class="material-symbols-outlined text-white text-[32px]" style="font-variation-settings:'FILL' 1;">lock</span>
            </div>
            <h2 class="text-xl font-bold text-white">Sign In Required</h2>
            <p class="text-white/80 text-sm mt-1">Please sign in to perform this action</p>
          </div>

          <!-- Body -->
          <div class="px-6 py-6 flex flex-col gap-3">
            <button (click)="guestGuard.goToSignup()"
              class="w-full flex items-center justify-center gap-2 py-3 bg-[#004ac6] text-white text-sm font-semibold rounded-xl hover:bg-[#2563eb] transition-all">
              <span class="material-symbols-outlined text-[18px]">person_add</span>
              Create Free Account
            </button>
            <button (click)="guestGuard.goToLogin()"
              class="w-full flex items-center justify-center gap-2 py-3 bg-[#f2f4f6] text-[#191c1e] text-sm font-semibold rounded-xl hover:bg-[#e6e8ea] transition-all">
              <span class="material-symbols-outlined text-[18px]">login</span>
              Sign In
            </button>
            <button (click)="guestGuard.dismissPopup()"
              class="text-xs text-[#737686] hover:text-[#434655] transition-colors text-center mt-1">
              Continue browsing (read-only)
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class SignInPopupComponent {
  constructor(public guestGuard: GuestGuardService) {}
}
