import { Injectable } from '@angular/core';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  User,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  getAuth,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { environment } from '../../environments/environment';

const SIGNUP_PROFILE_KEY = 'firebase_signup_profile';

export interface FirebaseSignupProfile {
  fullName: string;
  phone?: string;
}

@Injectable({ providedIn: 'root' })
export class FirebaseEmailService {
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;

  isConfigured(): boolean {
    const fb = environment.firebase;
    return Boolean(fb?.apiKey && fb?.projectId && fb?.appId);
  }

  get currentUser(): User | null {
    this.ensureAuth();
    return this.auth?.currentUser ?? null;
  }

  private verificationContinueUrl(): string {
    const base =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : environment.appUrl;
    return `${base.replace(/\/$/, '')}/login?verified=1`;
  }

  private passwordResetUrl(): string {
    const base =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : environment.appUrl;
    return `${base.replace(/\/$/, '')}/reset-password`;
  }

  static saveSignupProfile(profile: FirebaseSignupProfile): void {
    sessionStorage.setItem(SIGNUP_PROFILE_KEY, JSON.stringify(profile));
  }

  static loadSignupProfile(): FirebaseSignupProfile | null {
    try {
      const raw = sessionStorage.getItem(SIGNUP_PROFILE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as FirebaseSignupProfile;
    } catch {
      return null;
    }
  }

  static clearSignupProfile(): void {
    sessionStorage.removeItem(SIGNUP_PROFILE_KEY);
  }

  async signUp(email: string, password: string, fullName: string): Promise<void> {
    this.ensureAuth();
    const normalized = email.trim().toLowerCase();
    try {
      const credential = await createUserWithEmailAndPassword(this.auth!, normalized, password);
      await updateProfile(credential.user, { displayName: fullName.trim() });
      await sendEmailVerification(credential.user, {
        url: this.verificationContinueUrl(),
        handleCodeInApp: false,
      });
    } catch (err: unknown) {
      throw new Error(FirebaseEmailService.formatAuthError(err));
    }
  }

  async signIn(email: string, password: string): Promise<User> {
    this.ensureAuth();
    try {
      const credential = await signInWithEmailAndPassword(
        this.auth!,
        email.trim().toLowerCase(),
        password
      );
      return credential.user;
    } catch (err: unknown) {
      throw new Error(FirebaseEmailService.formatAuthError(err));
    }
  }

  async signOut(): Promise<void> {
    if (!this.auth) return;
    await signOut(this.auth);
  }

  isEmailVerified(user?: User | null): boolean {
    const u = user ?? this.currentUser;
    return Boolean(u?.emailVerified);
  }

  async getIdToken(forceRefresh = false): Promise<string> {
    const user = this.currentUser;
    if (!user) {
      throw new Error('Not signed in to Firebase.');
    }
    return user.getIdToken(forceRefresh);
  }

  async resendVerificationEmail(): Promise<void> {
    const user = this.currentUser;
    if (!user) {
      throw new Error('Open this page in the same browser where you signed up, or sign in to resend.');
    }
    if (user.emailVerified) {
      throw new Error('This email is already verified. You can sign in.');
    }
    try {
      await sendEmailVerification(user, {
        url: this.verificationContinueUrl(),
        handleCodeInApp: false,
      });
    } catch (err: unknown) {
      throw new Error(FirebaseEmailService.formatAuthError(err));
    }
  }

  async resendWithPassword(email: string, password: string): Promise<void> {
    await this.signIn(email, password);
    await this.resendVerificationEmail();
  }

  async sendPasswordReset(email: string): Promise<void> {
    this.ensureAuth();
    try {
      await sendPasswordResetEmail(this.auth!, email.trim().toLowerCase(), {
        url: this.passwordResetUrl(),
        handleCodeInApp: false,
      });
    } catch (err: unknown) {
      throw new Error(FirebaseEmailService.formatAuthError(err));
    }
  }

  async confirmPasswordReset(oobCode: string, newPassword: string): Promise<string> {
    this.ensureAuth();
    try {
      await confirmPasswordReset(this.auth!, oobCode, newPassword);
      const user = this.currentUser;
      if (!user) {
        throw new Error('Password was reset. Please sign in with your new password.');
      }
      return user.getIdToken(true);
    } catch (err: unknown) {
      throw new Error(FirebaseEmailService.formatAuthError(err));
    }
  }

  static formatAuthError(err: unknown): string {
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? String((err as { code: string }).code)
        : '';
    const message = err instanceof Error ? err.message : '';

    if (code === 'auth/email-already-in-use') {
      return (
        'This email is already registered. On Sign In, use the same password you chose at signup. ' +
        'Or use Forgot password. If you just signed up, verify your email first (check spam).'
      );
    }
    if (code === 'auth/account-exists-with-different-credential') {
      return 'This email is registered with a different sign-in method. Use email + password or reset your password.';
    }
    if (code === 'auth/invalid-email') {
      return 'Enter a valid email address.';
    }
    if (code === 'auth/weak-password') {
      return 'Password must be at least 8 characters.';
    }
    if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
      return 'Invalid email or password.';
    }
    if (code === 'auth/too-many-requests') {
      return 'Too many attempts. Wait a few minutes and try again.';
    }
    if (code === 'auth/operation-not-allowed') {
      return 'Email/password sign-in is disabled in Firebase. Enable it under Authentication → Sign-in method → Email/Password.';
    }
    if (message) return message;
    return 'Authentication failed. Please try again.';
  }

  private ensureAuth(): void {
    if (!this.isConfigured()) {
      throw new Error(
        'Firebase is not configured. Add firebase settings to src/environments/environment.ts'
      );
    }
    if (!this.app) {
      this.app = getApps().length ? getApp() : initializeApp(environment.firebase);
      this.auth = getAuth(this.app);
    }
  }
}
