import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { PaymentMethodService } from '../../core/payment-method.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './signup.html',
  styleUrl: './signup.scss'
})
export class SignupComponent {
  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';
  agreeTerms = false;
  showPassword = false;
  showConfirmPassword = false;

  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(private auth: AuthService, private router: Router, private paymentMethodService: PaymentMethodService) {}

  get passwordMismatch(): boolean {
    return this.confirmPassword.length > 0 && this.password !== this.confirmPassword;
  }

  get isFormValid(): boolean {
    return (
      this.fullName.trim().length > 0 &&
      this.email.trim().length > 0 &&
      this.password.length >= 8 &&
      this.confirmPassword === this.password &&
      this.agreeTerms
    );
  }

  togglePassword(): void { this.showPassword = !this.showPassword; }
  toggleConfirmPassword(): void { this.showConfirmPassword = !this.showConfirmPassword; }

  async onSubmit(): Promise<void> {
    if (!this.isFormValid) return;

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const { error } = await this.auth.signUp(this.email, this.password, this.fullName);

    this.loading = false;

    if (error) {
      this.errorMessage = error.message;
      return;
    }

    this.successMessage = 'Account created! Please check your email inbox and click the confirmation link, then come back to sign in.';
    setTimeout(() => this.router.navigate(['/login']), 3500);
  }
}
