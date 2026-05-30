import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ApiAuthService } from '../../core/api-auth.service';

@Component({
  selector: 'app-verification-success',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './verification-success.html',
  styleUrl: '../login/login.scss',
})
export class VerificationSuccessComponent implements OnInit {
  constructor(
    private router: Router,
    private auth: AuthService,
    private apiAuth: ApiAuthService
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      const token = this.apiAuth.getToken();
      if (token) {
        const user = await this.apiAuth.me();
        this.auth.setApiSession(token, user);
      }
    } catch {
      /* token may not be ready yet */
    }
    setTimeout(() => this.router.navigate(['/setup-payment']), 4000);
  }
}
