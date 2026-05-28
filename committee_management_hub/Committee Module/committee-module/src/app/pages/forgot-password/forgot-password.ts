import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(private auth: AuthService) {}

  async onSubmit(): Promise<void> {
    if (!this.email.trim()) return;
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const { error, message } = await this.auth.forgotPassword(this.email.trim());

      if (error) {
        this.errorMessage = error;
        return;
      }

      this.successMessage =
        message || 'If an account exists for this email, a password reset link has been sent.';
    } finally {
      this.loading = false;
    }
  }
}
