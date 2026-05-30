import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { NotificationService } from '../../core/notification.service';
import { PaymentMethodService } from '../../core/payment-method.service';
import { ProfileService } from '../../core/profile.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent implements OnInit {
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
    private profileService: ProfileService
  ) {}

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('verified') === '1') {
      this.successBanner.set('Email verified! You can now sign in.');
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
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const { error } = await this.auth.signIn(this.email.trim().toLowerCase(), this.password);

      if (error) {
        this.errorMessage.set(error.message);
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
