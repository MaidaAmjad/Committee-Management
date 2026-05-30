import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: '../login/login.scss',
})
export class ForgotPasswordComponent {
  email = '';
  loading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  get emailValid(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim());
  }

  async onSubmit(): Promise<void> {
    if (!this.emailValid || this.loading()) return;
    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const { error, message } = await this.auth.forgotPassword(this.email.trim().toLowerCase());
    this.loading.set(false);

    if (error) {
      this.errorMessage.set(error);
      return;
    }

    this.successMessage.set(
      message || 'If an account exists for this email, a password reset link has been sent.'
    );
  }
}
