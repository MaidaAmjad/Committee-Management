import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';

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

  constructor(private router: Router) {}

  onSubmit(): void {
    if (!this.email || !this.password) return;
    this.router.navigate(['/dashboard']);
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }
}
