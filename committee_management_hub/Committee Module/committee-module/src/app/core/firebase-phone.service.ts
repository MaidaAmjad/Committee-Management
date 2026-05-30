import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  Auth,
  ConfirmationResult,
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from 'firebase/auth';
import { environment } from '../../environments/environment';

type RecaptchaContainer = string | HTMLElement;

/** Client-side Firebase Phone Auth (OTP send + confirm). */
@Injectable({ providedIn: 'root' })
export class FirebasePhoneService {
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private recaptcha: RecaptchaVerifier | null = null;
  private recaptchaContainer: RecaptchaContainer | null = null;
  private confirmation: ConfirmationResult | null = null;

  isConfigured(): boolean {
    const fb = environment.firebase;
    return Boolean(fb?.apiKey && fb?.projectId && fb?.appId);
  }

  /** Render visible reCAPTCHA inside the given DOM element (after view init). */
  async prepareRecaptcha(container: RecaptchaContainer): Promise<void> {
    this.ensureAuth();
    this.destroyRecaptcha();
    await this.renderRecaptcha(container);
  }

  /** Send OTP via Firebase after user completes the visible reCAPTCHA. */
  async sendOtp(phoneE164: string, container: RecaptchaContainer): Promise<void> {
    this.ensureAuth();
    if (!this.recaptcha || !this.sameContainer(container)) {
      await this.prepareRecaptcha(container);
    }
    try {
      this.confirmation = await signInWithPhoneNumber(this.auth!, phoneE164, this.recaptcha!);
    } catch (err: unknown) {
      throw new Error(FirebasePhoneService.formatAuthError(err));
    }
  }

  /** Reset widget before resend (reCAPTCHA tokens are single-use). */
  async resetRecaptcha(container: RecaptchaContainer): Promise<void> {
    this.confirmation = null;
    await this.prepareRecaptcha(container);
  }

  /** Confirm 6-digit OTP; returns Firebase ID token for backend verification. */
  async confirmOtp(code: string): Promise<string> {
    if (!this.confirmation) {
      throw new Error('No OTP was sent. Complete the security check and tap Send OTP first.');
    }
    try {
      const credential = await this.confirmation.confirm(code.trim());
      return credential.user.getIdToken();
    } catch (err: unknown) {
      throw new Error(FirebasePhoneService.formatAuthError(err));
    }
  }

  /** Map Firebase Auth error codes to actionable messages. */
  static formatAuthError(err: unknown): string {
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? String((err as { code: string }).code)
        : '';
    const message = err instanceof Error ? err.message : '';
    if (code === 'auth/billing-not-enabled') {
      return (
        'Real SMS requires Firebase Blaze (pay-as-you-go) billing. On the free Spark plan, use a test phone: ' +
        'Firebase Console → Authentication → Sign-in method → Phone → Phone numbers for testing ' +
        '(e.g. +923001234567 with code 123456). To send real SMS, upgrade to Blaze in Project settings → Usage and billing.'
      );
    }
    if (code === 'auth/operation-not-allowed') {
      return (
        'Firebase blocked SMS for this phone number. In Firebase Console → Authentication → Settings → ' +
        'SMS region policy: choose Allow, then add Pakistan (+92). For testing without SMS, add a test phone ' +
        'under Sign-in method → Phone → Phone numbers for testing.'
      );
    }
    if (code === 'auth/captcha-check-failed' || code === 'auth/missing-recaptcha-token') {
      return (
        'Security check was not completed. Tick "I\'m not a robot", complete any image challenge ' +
        '(do not close or skip it), then tap Send OTP again.'
      );
    }
    if (code === 'auth/invalid-verification-code') {
      return 'Invalid OTP code. Check the SMS and try again.';
    }
    if (code === 'auth/code-expired') {
      return 'OTP expired. Complete reCAPTCHA and tap Send OTP to get a new code.';
    }
    if (code === 'auth/too-many-requests') {
      return (
        'Too many OTP attempts for this number or device. Wait 15–60 minutes, or use a Firebase test phone ' +
        '(Authentication → Sign-in method → Phone → Phone numbers for testing).'
      );
    }
    if (message.includes('already been rendered') || message.includes('element has been removed')) {
      return 'Security check failed to load. Refresh the page and try again.';
    }
    if (message) return message;
    return 'Phone verification failed. Please try again.';
  }

  clear(): void {
    this.confirmation = null;
    this.destroyRecaptcha();
  }

  private ensureAuth(): void {
    if (!this.isConfigured()) {
      throw new Error(
        'Firebase Phone Auth is not configured. Add firebase settings to src/environments/environment.ts'
      );
    }
    if (!this.app) {
      this.app = initializeApp(environment.firebase);
      this.auth = getAuth(this.app);
    }
  }

  private sameContainer(container: RecaptchaContainer): boolean {
    if (!this.recaptchaContainer) return false;
    if (typeof container === 'string') {
      return this.recaptchaContainer === container;
    }
    return this.recaptchaContainer === container;
  }

  private async renderRecaptcha(container: RecaptchaContainer): Promise<void> {
    const el = typeof container === 'string' ? document.getElementById(container) : container;
    if (!el) {
      throw new Error('Security check container not found. Refresh the page and try again.');
    }

    if (el.childElementCount > 0) {
      el.replaceChildren();
    }

    this.recaptchaContainer = container;
    this.recaptcha = new RecaptchaVerifier(this.auth!, el, {
      size: 'normal',
      callback: () => {},
      'expired-callback': () => {
        this.confirmation = null;
      },
    });
    await this.recaptcha.render();
  }

  private destroyRecaptcha(): void {
    if (this.recaptcha) {
      try {
        this.recaptcha.clear();
      } catch {
        /* ignore */
      }
      this.recaptcha = null;
    }
    this.recaptchaContainer = null;
  }
}
