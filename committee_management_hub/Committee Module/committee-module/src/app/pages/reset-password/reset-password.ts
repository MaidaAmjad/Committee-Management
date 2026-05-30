import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { PhoneAuthApiService } from '../../core/phone-auth-api.service';
import { SupabaseService } from '../../core/supabase.service';
import { environment } from '../../../environments/environment';
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
  phoneResetMode = false;
  resetSessionId = '';
  resetIdToken = '';
  supabaseRecoveryMode = false;
  firebaseResetMode = false;
  firebaseOobCode = '';
  newPassword = '';
  confirmPassword = '';
  showPassword = false;
  loading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  private authSub?: SupabaseAuthSubscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
    private phoneAuthApi: PhoneAuthApiService,
    private supabaseService: SupabaseService
  ) {}

  async ngOnInit(): Promise<void> {
    this.phoneResetMode = this.route.snapshot.queryParamMap.get('mode') === 'phone';
    if (this.phoneResetMode) {
      this.resetSessionId = sessionStorage.getItem('reset_session_id') || '';
      this.resetIdToken = sessionStorage.getItem('otp_id_token') || '';
      if (!this.resetSessionId || !this.resetIdToken) {
        this.errorMessage.set('OTP session expired. Please request a new reset OTP.');
      }
      return;
    }

    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    const oobCode = this.route.snapshot.queryParamMap.get('oobCode');
    const mode = this.route.snapshot.queryParamMap.get('mode');
    if (
      environment.useFirebaseEmailVerification !== false &&
      oobCode &&
      mode === 'resetPassword'
    ) {
      this.firebaseResetMode = true;
      this.firebaseOobCode = oobCode;
      this.errorMessage.set('');
      return;
    }

    const code = this.route.snapshot.queryParamMap.get('code');
    if (code) {
      const { error } = await this.auth.exchangeRecoveryCode(code);
      if (error) {
        this.errorMessage.set(error);
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
        this.errorMessage.set('');
      }
    });
    this.authSub = authListener.subscription;

    const { data: sessionData } = await this.supabaseService.client.auth.getSession();
    if (sessionData.session && (this.supabaseRecoveryMode || !this.token)) {
      this.supabaseRecoveryMode = true;
      this.errorMessage.set('');
    }

    if (!this.token && !this.supabaseRecoveryMode && !this.firebaseResetMode) {
      this.errorMessage.set('Invalid or expired reset link. Request a new one from forgot password.');
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
      (this.phoneResetMode ||
        this.supabaseRecoveryMode ||
        this.firebaseResetMode ||
        !!this.token) &&
      this.newPassword.length >= 8 &&
      this.newPassword === this.confirmPassword
    );
  }

  async onSubmit(): Promise<void> {
    if (!this.isValid || this.loading()) return;
    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      if (this.phoneResetMode) {
        const res = await this.phoneAuthApi.completeForgotReset(
          this.resetSessionId,
          this.resetIdToken,
          this.newPassword
        );
        sessionStorage.removeItem('reset_session_id');
        sessionStorage.removeItem('otp_id_token');
        this.successMessage.set(res.message || 'Password updated successfully.');
        setTimeout(() => this.router.navigate(['/login']), 2500);
        return;
      }

      const { error, message } = this.firebaseResetMode
        ? await this.auth.resetPasswordWithFirebase(this.firebaseOobCode, this.newPassword)
        : this.supabaseRecoveryMode
          ? await this.auth.resetPasswordWithSupabase(this.newPassword)
          : await this.auth.resetPassword(this.token, this.newPassword);

      if (error) {
        this.errorMessage.set(error);
        return;
      }

      this.successMessage.set(message || 'Password updated successfully.');
      setTimeout(() => this.router.navigate(['/login']), 2500);
    } catch (err: unknown) {
      this.errorMessage.set(PhoneAuthApiService.formatError(err));
    } finally {
      this.loading.set(false);
    }
  }
}
