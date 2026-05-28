import { Component, OnInit } from '@angular/core';
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
  styleUrl: './login.scss'
})
export class LoginComponent {
  email = '';
  password = '';
  rememberMe = false;
  showPassword = false;
  loading = false;
  errorMessage = '';

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
      this.errorMessage = '';
      this.successBanner = 'Email verified! You can now sign in.';
    }
  }

  successBanner = '';

  togglePassword(): void { this.showPassword = !this.showPassword; }

  async onSubmit(): Promise<void> {
    if (!this.email || !this.password) return;
    this.loading = true;
    this.errorMessage = '';

    const { error } = await this.auth.signIn(this.email, this.password);
    this.loading = false;

    if (error) {
      this.errorMessage = error.message;
      return;
    }

    await this.profileService.syncMetadataToProfile();

    // Check payment setup
    const setupComplete = await this.paymentMethodService.isSetupComplete();
    if (!setupComplete) {
      this.router.navigate(['/setup-payment']);
      return;
    }

    // Load notifications after login
    await this.notificationService.loadUnread();
    this.router.navigate(['/dashboard']);
  }
}
