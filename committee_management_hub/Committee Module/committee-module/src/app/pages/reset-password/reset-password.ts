import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { SupabaseService } from '../../core/supabase.service';
import type { Subscription as SupabaseAuthSubscription } from '@supabase/supabase-js';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: '../login/login.scss',
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  token = '';
  /** True when user arrived via Supabase reset email (production / Vercel). */
  supabaseRecoveryMode = false;
  newPassword = '';
  confirmPassword = '';
  showPassword = false;
  loading = false;
  errorMessage = '';
  successMessage = '';
  private authSub?: SupabaseAuthSubscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
    private supabaseService: SupabaseService
  ) {}

  async ngOnInit(): Promise<void> {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';

    const code = this.route.snapshot.queryParamMap.get('code');
    if (code) {
      const { error } = await this.auth.exchangeRecoveryCode(code);
      if (error) {
        this.errorMessage = error;
        return;
      }
      this.supabaseRecoveryMode = true;
    }

    if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
      this.supabaseRecoveryMode = true;
    }

    const { data: authListener } = this.supabaseService.client.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        this.supabaseRecoveryMode = true;
        this.errorMessage = '';
      }
    });
    this.authSub = authListener.subscription;

    const { data: sessionData } = await this.supabaseService.client.auth.getSession();
    if (sessionData.session && (this.supabaseRecoveryMode || !this.token)) {
      this.supabaseRecoveryMode = true;
      this.errorMessage = '';
    }

    if (!this.token && !this.supabaseRecoveryMode) {
      this.errorMessage = 'Invalid or expired reset link. Please request a new password reset email.';
    }
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  get isValid(): boolean {
    return (
      (this.supabaseRecoveryMode || !!this.token) &&
      this.newPassword.length >= 8 &&
      this.newPassword === this.confirmPassword
    );
  }

  async onSubmit(): Promise<void> {
    if (!this.isValid) return;
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const { error, message } = this.supabaseRecoveryMode
        ? await this.auth.resetPasswordWithSupabase(this.newPassword)
        : await this.auth.resetPassword(this.token, this.newPassword);

      if (error) {
        this.errorMessage = error;
        return;
      }

      this.successMessage = message || 'Password updated successfully.';
      setTimeout(() => this.router.navigate(['/login']), 2500);
    } finally {
      this.loading = false;
    }
  }
}
