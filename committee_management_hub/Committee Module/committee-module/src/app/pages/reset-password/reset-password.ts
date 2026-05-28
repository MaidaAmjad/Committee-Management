import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: '../login/login.scss',
})
export class ResetPasswordComponent implements OnInit {
  token = '';
  newPassword = '';
  confirmPassword = '';
  showPassword = false;
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.errorMessage = 'Invalid reset link. Please request a new password reset email.';
    }
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  get isValid(): boolean {
    return (
      !!this.token &&
      this.newPassword.length >= 8 &&
      this.newPassword === this.confirmPassword
    );
  }

  async onSubmit(): Promise<void> {
    if (!this.isValid) return;
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const { error, message } = await this.auth.resetPassword(this.token, this.newPassword);
    this.loading = false;

    if (error) {
      this.errorMessage = error;
      return;
    }

    this.successMessage = message || 'Password updated successfully.';
    setTimeout(() => this.router.navigate(['/login']), 2500);
  }
}
