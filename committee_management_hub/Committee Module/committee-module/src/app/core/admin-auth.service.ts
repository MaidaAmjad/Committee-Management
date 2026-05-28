import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

// Hardcoded admin credentials
const ADMIN_EMAIL    = 'maidaamjad32@gmail.com';
const ADMIN_PASSWORD = 'maida0123';
const ADMIN_NAME     = 'Maida Amjad';
const SESSION_KEY    = 'admin_session';

@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  isLoggedIn = signal(false);
  /** Held in memory only for admin API calls during this browser session. */
  private sessionPassword = '';

  constructor(private router: Router) {
    // Restore session from sessionStorage on app load
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored === 'true') this.isLoggedIn.set(true);
  }

  /** Validate credentials and start an admin session. */
  login(email: string, password: string): { success: boolean; error: string | null } {
    if (email.trim().toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      this.isLoggedIn.set(true);
      this.sessionPassword = password;
      sessionStorage.setItem(SESSION_KEY, 'true');
      return { success: true, error: null };
    }
    return { success: false, error: 'Invalid email or password.' };
  }

  /** Credentials for trusted admin API routes (suspend / reinstate). */
  getApiAuthBody(): { adminEmail: string; adminPassword: string } | null {
    if (!this.isLoggedIn() || !this.sessionPassword) return null;
    return { adminEmail: ADMIN_EMAIL, adminPassword: this.sessionPassword };
  }

  /** End the admin session and redirect to admin login. */
  logout(): void {
    this.isLoggedIn.set(false);
    this.sessionPassword = '';
    sessionStorage.removeItem(SESSION_KEY);
    this.router.navigate(['/admin/login']);
  }

  get adminName(): string { return ADMIN_NAME; }
  get adminEmail(): string { return ADMIN_EMAIL; }
}
