import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ApiAuthService } from '../../core/api-auth.service';
import { COUNTRY_DIAL_CODES } from '../../data/country-dial-codes';
import { buildE164, isPlausibleE164 } from '../../core/phone.utils';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './signup.html',
  styleUrl: './signup.scss',
})
export class SignupComponent {
  fullName = '';
  countries = COUNTRY_DIAL_CODES;
  countryIso2 = 'PK';
  phoneNational = '';
  email = '';
  password = '';
  confirmPassword = '';
  agreeTerms = false;
  showPassword = false;
  showConfirmPassword = false;

  loading = signal(false);
  errorMessage = signal('');

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  get selectedDial(): string {
    return this.countries.find(c => c.iso2 === this.countryIso2)?.dial ?? '92';
  }

  get passwordMismatch(): boolean {
    return this.confirmPassword.length > 0 && this.password !== this.confirmPassword;
  }

  get phoneE164(): string {
    return buildE164(this.selectedDial, this.phoneNational);
  }

  get emailValid(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim());
  }

  get phoneValid(): boolean {
    return this.phoneNational.trim().length > 0 && isPlausibleE164(this.phoneE164);
  }

  onPhoneNationalInput(): void {
    this.phoneNational = this.phoneNational.replace(/\D/g, '').slice(0, 15);
  }

  get isFormValid(): boolean {
    return (
      this.fullName.trim().length >= 2 &&
      this.emailValid &&
      this.phoneValid &&
      this.password.length >= 8 &&
      this.confirmPassword === this.password &&
      this.agreeTerms
    );
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  async onSubmit(): Promise<void> {
    if (!this.isFormValid || this.loading()) return;

    this.loading.set(true);
    this.errorMessage.set('');

    const normalizedEmail = this.email.trim().toLowerCase();
    if (!this.phoneValid) {
      this.errorMessage.set('Enter a valid mobile number with country code.');
      this.loading.set(false);
      return;
    }

    try {
      const result = await this.auth.signUp(
        normalizedEmail,
        this.password,
        this.fullName.trim(),
        this.phoneE164
      );

      if (result.error) {
        this.errorMessage.set(result.error.message || 'Registration failed.');
        return;
      }

      sessionStorage.setItem('pending_verify_email', normalizedEmail);
      if (result.message) {
        sessionStorage.setItem('signup_message', result.message);
      }
      if (result.devVerifyUrl) {
        sessionStorage.setItem('dev_verify_url', result.devVerifyUrl);
      } else {
        sessionStorage.removeItem('dev_verify_url');
      }

      await this.router.navigate(['/check-email'], {
        queryParams: { email: normalizedEmail },
      });
    } catch (err: unknown) {
      this.errorMessage.set(ApiAuthService.formatError(err));
    } finally {
      this.loading.set(false);
    }
  }
}
