import { Component, OnInit, AfterViewInit, ElementRef, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { NotificationService } from '../../core/notification.service';
import { PaymentMethodService } from '../../core/payment-method.service';
import { ProfileService } from '../../core/profile.service';
import { RecaptchaV2Service } from '../../core/recaptcha-v2.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent implements OnInit, AfterViewInit {
  @ViewChild('captchaHost') captchaHost?: ElementRef<HTMLDivElement>;

  captchaReady = signal(false);
  email = '';
  password = '';
  rememberMe = false;
  showPassword = false;
  loading = signal(false);
  errorMessage = signal('');
  successBanner = signal('');

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private notificationService: NotificationService,
    private paymentMethodService: PaymentMethodService,
    private profileService: ProfileService,
    private recaptcha: RecaptchaV2Service
  ) {}

  get captchaEnabled(): boolean {
    return this.recaptcha.isEnabled();
  }

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('verified') === '1') {
      this.successBanner.set('Email verified! You can now sign in.');
    }
  }

  async ngAfterViewInit(): Promise<void> {
    if (!this.captchaEnabled) {
      this.captchaReady.set(true);
      return;
    }
    const el = this.captchaHost?.nativeElement;
    if (!el) return;
    try {
      await this.recaptcha.render(el);
      this.captchaReady.set(true);
    } catch (err: unknown) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Could not load security check.');
    }
  }

  get emailValid(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim());
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  async onSubmit(): Promise<void> {
    if (!this.emailValid || !this.password || this.loading()) return;

    const captchaToken = this.recaptcha.getResponse();
    if (this.captchaEnabled && !captchaToken) {
      this.errorMessage.set('Complete the security check (CAPTCHA) before continuing.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const { error } = await this.auth.signIn(
        this.email.trim().toLowerCase(),
        this.password,
        captchaToken
      );

      if (error) {
        this.errorMessage.set(error.message);
        this.recaptcha.reset();
        return;
      }

      await this.auth.ensureSupabaseSession();
      await this.profileService.syncMetadataToProfile();

      const setupComplete = await this.paymentMethodService.isSetupComplete();
      if (!setupComplete) {
        this.router.navigate(['/setup-payment']);
        return;
      }

      await this.notificationService.loadUnread();
      this.router.navigate(['/dashboard']);
    } finally {
      this.loading.set(false);
    }
  }
}
