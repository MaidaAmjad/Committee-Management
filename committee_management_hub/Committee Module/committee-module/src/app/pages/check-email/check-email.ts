import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-check-email',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './check-email.html',
  styleUrl: '../login/login.scss',
})
export class CheckEmailComponent implements OnInit {
  email = '';
  resendPassword = '';
  showPasswordForResend = signal(false);
  useFirebase = environment.useFirebaseEmailVerification !== false;
  infoMessage = signal('');
  devVerifyUrl = signal('');
  resendLoading = signal(false);
  resendMessage = signal('');
  resendError = signal('');

  constructor(
    private route: ActivatedRoute,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.email =
      this.route.snapshot.queryParamMap.get('email') ||
      sessionStorage.getItem('pending_verify_email') ||
      '';

    this.infoMessage.set(
      sessionStorage.getItem('signup_message') ||
        (this.useFirebase
          ? 'We sent a verification email from Firebase. Open the link, then return here to sign in.'
          : 'We sent a verification link to your email. Open it to activate your account, then sign in.')
    );

    const devUrl = sessionStorage.getItem('dev_verify_url');
    if (devUrl) {
      this.devVerifyUrl.set(devUrl);
    }
  }

  async resend(): Promise<void> {
    if (!this.email || this.resendLoading()) return;

    this.resendLoading.set(true);
    this.resendError.set('');
    this.resendMessage.set('');

    const { error, message } = await this.auth.resendVerificationEmail(
      this.email,
      this.resendPassword.trim() || undefined
    );
    this.resendLoading.set(false);

    if (error) {
      this.resendError.set(error);
      if (this.useFirebase && !this.showPasswordForResend()) {
        this.showPasswordForResend.set(true);
      }
      return;
    }

    this.resendMessage.set(message || 'Verification email sent. Check your inbox and spam folder.');
  }
}
