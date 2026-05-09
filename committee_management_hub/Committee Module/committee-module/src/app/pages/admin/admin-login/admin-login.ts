import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AdminAuthService } from '../../../core/admin-auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-login.html',
})
export class AdminLoginComponent {
  email        = '';
  password     = '';
  showPassword = false;
  loading      = false;
  errorMessage = '';

  constructor(
    private adminAuth: AdminAuthService,
    private router: Router,
  ) {
    // Already logged in → go straight to dashboard
    if (this.adminAuth.isLoggedIn()) {
      this.router.navigate(['/admin']);
    }
  }

  togglePassword(): void { this.showPassword = !this.showPassword; }

  onSubmit(): void {
    if (!this.email || !this.password) return;
    this.loading = true;
    this.errorMessage = '';

    // Small artificial delay so the spinner is visible
    setTimeout(() => {
      const { success, error } = this.adminAuth.login(this.email, this.password);
      this.loading = false;

      if (!success) {
        this.errorMessage = error ?? 'Login failed.';
        return;
      }

      this.router.navigate(['/admin']);
    }, 600);
  }
}
