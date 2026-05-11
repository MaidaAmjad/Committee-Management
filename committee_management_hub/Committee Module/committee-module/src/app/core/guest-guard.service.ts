import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Service to handle guest (unauthenticated) users.
 * Shows a "Please Sign In" popup when guests try to perform actions.
 */
@Injectable({ providedIn: 'root' })
export class GuestGuardService {
  showSignInPopup = signal(false);

  constructor(private auth: AuthService, private router: Router) {}

  /** Returns true if user is logged in. If not, shows the sign-in popup. */
  requireAuth(): boolean {
    if (this.auth.user()) return true;
    this.showSignInPopup.set(true);
    return false;
  }

  /** Check if current user is a guest (not logged in) */
  isGuest(): boolean {
    return !this.auth.user();
  }

  dismissPopup(): void {
    this.showSignInPopup.set(false);
  }

  goToLogin(): void {
    this.showSignInPopup.set(false);
    this.router.navigate(['/login']);
  }

  goToSignup(): void {
    this.showSignInPopup.set(false);
    this.router.navigate(['/signup']);
  }
}
