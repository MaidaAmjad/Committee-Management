import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { NotificationService } from '../../core/notification.service';
import { PaymentMethodService } from '../../core/payment-method.service';

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
    private notificationService: NotificationService,
    private paymentMethodService: PaymentMethodService
  ) {}

  togglePassword(): void { this.showPassword = !this.showPassword; }

  async onSubmit(): Promise<void> {
    if (!this.email || !this.password) return;
    this.loading = true;
    this.errorMessage = '';

    const { error } = await this.auth.signIn(this.email, this.password);
    this.loading = false;

    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed')) {
        this.errorMessage = 'Your email is not confirmed yet. Please check your inbox and click the confirmation link.';
      } else {
        this.errorMessage = error.message;
      }
      return;
    }

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
