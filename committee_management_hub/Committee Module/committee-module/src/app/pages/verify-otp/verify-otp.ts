import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FirebasePhoneService } from '../../core/firebase-phone.service';
import { PhoneAuthApiService } from '../../core/phone-auth-api.service';
import { ApiAuthService } from '../../core/api-auth.service';
import { AuthService } from '../../core/auth.service';

type OtpPurpose = 'signup' | 'forgot';

@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './verify-otp.html',
  styleUrl: './verify-otp.scss',
})
export class VerifyOtpComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('recaptchaHost') recaptchaHost?: ElementRef<HTMLDivElement>;

  otpCode = '';
  loading = signal(false);
  sending = signal(false);
  captchaReady = signal(false);
  otpSent = signal(false);
  errorMessage = signal('');
  infoMessage = signal('');

  sessionId = '';
  phone = '';
  purpose: OtpPurpose = 'signup';
  password = '';

  cooldownSeconds = signal(0);
  resendCount = signal(0);
  maxResends = 3;
  private cooldownTimer: ReturnType<typeof setInterval> | null = null;
  private sendInFlight = false;

  constructor(
    private firebasePhone: FirebasePhoneService,
    private phoneAuthApi: PhoneAuthApiService,
    private apiAuth: ApiAuthService,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.sessionId = sessionStorage.getItem('otp_session_id') || '';
    this.phone = sessionStorage.getItem('otp_phone') || '';
    this.purpose = (sessionStorage.getItem('otp_purpose') as OtpPurpose) || 'signup';
    this.password = sessionStorage.getItem('otp_password') || '';
    this.maxResends = Number(sessionStorage.getItem('otp_max_resends') || 3);
    this.resendCount.set(Number(sessionStorage.getItem('otp_resend_count') || 0));

    if (!this.sessionId || !this.phone) {
      this.router.navigate([this.purpose === 'forgot' ? '/forgot-password' : '/signup']);
      return;
    }

    this.startCooldown(Number(sessionStorage.getItem('otp_cooldown') || 60));

    const otpAlreadySent = sessionStorage.getItem('otp_sent_session_id') === this.sessionId;
    if (otpAlreadySent) {
      this.otpSent.set(true);
      this.infoMessage.set(
        `Enter the 6-digit code sent to ${this.maskedPhone}. Tap Resend OTP if you did not receive it.`
      );
    } else {
      this.infoMessage.set(
        'Step 1: Complete the security check below. Step 2: Tap Send OTP. Do not close the CAPTCHA popup — finish the challenge if images appear.'
      );
    }
  }

  ngAfterViewInit(): void {
    if (!this.sessionId || !this.phone) return;
    queueMicrotask(() => void this.initCaptcha());
  }

  ngOnDestroy(): void {
    if (this.cooldownTimer) clearInterval(this.cooldownTimer);
    this.firebasePhone.clear();
  }

  get maskedPhone(): string {
    if (this.phone.length < 6) return this.phone;
    return `${this.phone.slice(0, 4)}****${this.phone.slice(-2)}`;
  }

  get canResend(): boolean {
    return (
      !this.rateLimited &&
      this.cooldownSeconds() <= 0 &&
      this.resendCount() < this.maxResends &&
      !this.sending()
    );
  }

  get rateLimited(): boolean {
    return this.errorMessage().toLowerCase().includes('too many otp');
  }

  startOver(): void {
    this.firebasePhone.clear();
    this.clearOtpSession();
    this.router.navigate([this.purpose === 'forgot' ? '/forgot-password' : '/signup']);
  }

  private async initCaptcha(): Promise<void> {
    const el = this.recaptchaHost?.nativeElement;
    if (!el) {
      this.errorMessage.set('Security check failed to load. Refresh the page and try again.');
      return;
    }
    try {
      await this.firebasePhone.prepareRecaptcha(el);
      this.captchaReady.set(true);
    } catch (err: unknown) {
      this.errorMessage.set(FirebasePhoneService.formatAuthError(err));
    }
  }

  private startCooldown(seconds: number): void {
    this.cooldownSeconds.set(seconds);
    if (this.cooldownTimer) clearInterval(this.cooldownTimer);
    this.cooldownTimer = setInterval(() => {
      const next = this.cooldownSeconds() - 1;
      this.cooldownSeconds.set(Math.max(0, next));
      if (next <= 0 && this.cooldownTimer) {
        clearInterval(this.cooldownTimer);
        this.cooldownTimer = null;
      }
    }, 1000);
  }

  async sendOtp(isResend: boolean): Promise<void> {
    if (this.sendInFlight) return;
    if (isResend && !this.canResend) return;

    this.sendInFlight = true;
    this.sending.set(true);
    this.errorMessage.set('');

    try {
      const container = this.recaptchaHost?.nativeElement;
      if (!container) {
        this.errorMessage.set('Security check failed to load. Refresh the page and try again.');
        return;
      }

      if (isResend) {
        const res = await this.phoneAuthApi.recordResend(this.sessionId);
        this.resendCount.set(res.resendCount ?? this.resendCount() + 1);
        sessionStorage.setItem('otp_resend_count', String(this.resendCount()));
        this.startCooldown(res.resendCooldownSeconds || 60);
        await this.firebasePhone.resetRecaptcha(container);
      }

      await this.firebasePhone.sendOtp(this.phone, container);
      sessionStorage.setItem('otp_sent_session_id', this.sessionId);
      this.otpSent.set(true);
      this.infoMessage.set(`OTP sent to ${this.maskedPhone}. Code expires in 5 minutes.`);
    } catch (err: unknown) {
      this.errorMessage.set(FirebasePhoneService.formatAuthError(err));
      if (isResend) {
        const container = this.recaptchaHost?.nativeElement;
        if (container) {
          await this.firebasePhone.resetRecaptcha(container).catch(() => undefined);
        }
      }
    } finally {
      this.sending.set(false);
      this.sendInFlight = false;
    }
  }

  async verifyOtp(): Promise<void> {
    if (this.loading() || this.otpCode.trim().length < 6) return;

    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const idToken = await this.firebasePhone.confirmOtp(this.otpCode);

      if (this.purpose === 'signup') {
        const res = await this.phoneAuthApi.completeSignup(
          this.sessionId,
          idToken,
          this.password
        );
        if (res.token && res.user) {
          this.auth.setApiSession(res.token, res.user);
          const sync = await this.auth.syncSupabaseSession(
            res.user.email,
            this.password,
            res.user.supabaseUserId
          );
          if (sync.error) {
            this.errorMessage.set(sync.error);
            return;
          }
        }
        this.clearOtpSession();
        await this.router.navigate(['/verification-success']);
        return;
      }

      sessionStorage.setItem('reset_session_id', this.sessionId);
      sessionStorage.setItem('otp_id_token', idToken);
      this.clearOtpSession();
      await this.router.navigate(['/reset-password'], { queryParams: { mode: 'phone' } });
    } catch (err: unknown) {
      this.errorMessage.set(FirebasePhoneService.formatAuthError(err));
    } finally {
      this.loading.set(false);
    }
  }

  private clearOtpSession(): void {
    sessionStorage.removeItem('otp_session_id');
    sessionStorage.removeItem('otp_phone');
    sessionStorage.removeItem('otp_purpose');
    sessionStorage.removeItem('otp_password');
    sessionStorage.removeItem('otp_resend_count');
    sessionStorage.removeItem('otp_max_resends');
    sessionStorage.removeItem('otp_cooldown');
    sessionStorage.removeItem('otp_sent_session_id');
  }
}
