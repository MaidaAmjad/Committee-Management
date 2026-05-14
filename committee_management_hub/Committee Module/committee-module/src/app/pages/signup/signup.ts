import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { COUNTRY_DIAL_CODES } from '../../data/country-dial-codes';
import { buildE164, isPlausibleE164 } from '../../core/phone.utils';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './signup.html',
  styleUrl: './signup.scss'
})
export class SignupComponent {
  fullName = '';
  countries = COUNTRY_DIAL_CODES;
  /** ISO 3166-1 alpha-2; default Pakistan */
  countryIso2 = 'PK';
  /** National number digits only (no country code) */
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

  constructor(private auth: AuthService, private router: Router) {}

  get selectedDial(): string {
    return this.countries.find(c => c.iso2 === this.countryIso2)?.dial ?? '92';
  }

  get passwordMismatch(): boolean {
    return this.confirmPassword.length > 0 && this.password !== this.confirmPassword;
  }

  get phoneE164(): string {
    return buildE164(this.selectedDial, this.phoneNational);
  }

  get phoneValid(): boolean {
    return isPlausibleE164(this.phoneE164);
  }

  onPhoneNationalInput(): void {
    this.phoneNational = this.phoneNational.replace(/\D/g, '').slice(0, 15);
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
