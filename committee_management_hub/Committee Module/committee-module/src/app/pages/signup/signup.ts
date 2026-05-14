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
  /** National mobile without country code: 10 digits starting with 3 (e.g. 3001234567) → stored as +923001234567 */
  phoneNational = '';
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

  /** E.164 Pakistan mobile, e.g. +923001234567 */
  get phoneE164(): string {
    const d = this.phoneNational.replace(/\D/g, '').slice(0, 10);
    if (d.length !== 10 || !d.startsWith('3')) return '';
    return `+92${d}`;
  }

  get phoneValid(): boolean {
    return this.phoneE164.length === 13;
  }

  onPhoneNationalInput(): void {
    this.phoneNational = this.phoneNational.replace(/\D/g, '').slice(0, 10);
  }

  get isFormValid(): boolean {
    return (
      this.fullName.trim().length > 0 &&
      this.phoneValid &&
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

    const { error } = await this.auth.signUp(this.email, this.password, this.fullName, this.phoneE164);

    this.loading = false;

    if (error) {
      this.errorMessage = error.message;
      return;
    }

    this.successMessage = 'Account created! Please check your email inbox and click the confirmation link, then come back to sign in.';
    setTimeout(() => this.router.navigate(['/login']), 3500);
  }
}
