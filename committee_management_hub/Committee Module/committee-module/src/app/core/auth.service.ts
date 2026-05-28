import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseClient, Session, User, AuthError } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { ApiAuthService, ApiUser } from './api-auth.service';
import { environment } from '../../environments/environment';

export interface AuthResult {
  error: AuthError | { message: string } | null;
}

export interface SignUpResult extends AuthResult {
  message?: string;
  verificationResent?: boolean;
}

const SUPABASE_AUTH_TIMEOUT_MS = 20_000;

function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('AUTH_REQUEST_TIMEOUT')), ms);
    Promise.resolve(promise)
      .then(value => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(err => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabase: SupabaseClient;

  session = signal<Session | null>(null);
  user = signal<User | null>(null);
  apiUser = signal<ApiUser | null>(null);

  readonly ready: Promise<void>;
  private _resolveReady!: () => void;

  constructor(
    private supabaseService: SupabaseService,
    private apiAuth: ApiAuthService,
    private router: Router
  ) {
    this.supabase = this.supabaseService.client;
    this.ready = new Promise(resolve => { this._resolveReady = resolve; });

    this.bootstrapAuth();
  }

  private usesApiAuth(): boolean {
    const url = environment.apiUrl?.trim() || '';
    return Boolean(
      url &&
      !url.includes('your-api-domain') &&
      !(environment.useSupabasePasswordReset && environment.production)
    );
  }

  private resetRedirectUrl(): string {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}/reset-password`;
    }
    return `${environment.appUrl}/reset-password`;
  }

  private async bootstrapAuth(): Promise<void> {
    try {
      if (this.usesApiAuth()) {
        const token = this.apiAuth.getToken();
        if (token) {
          const me = await this.apiAuth.me();
          this.apiUser.set(me);
        }
      }
    } catch {
      this.apiAuth.setToken(null);
      this.apiUser.set(null);
    }

    const { data } = await this.supabase.auth.getSession();
    this.session.set(data.session);
    this.user.set(data.session?.user ?? null);
    this._resolveReady();

    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.session.set(session);
      this.user.set(session?.user ?? null);
    });
  }

  async signUp(email: string, password: string, fullName: string, phone?: string): Promise<SignUpResult> {
    if (!this.usesApiAuth()) {
      return {
        error: {
          message: 'Sign up via the API is not available on the live site yet. Run locally or deploy the auth API.',
        } as AuthError,
      };
    }

    try {
      const res = await this.apiAuth.register({
        email,
        password,
        fullName,
        phone: phone?.trim() || undefined,
      });
      if (!res.success) {
        return { error: { message: res.message || 'Registration failed.' } as AuthError };
      }
      return {
        error: null,
        message: res.message,
        verificationResent: res.verificationResent === true,
      };
    } catch (err: unknown) {
      return { error: { message: ApiAuthService.formatError(err) } as AuthError };
    }
  }

  async resendVerificationEmail(email: string): Promise<{ error: string | null; message?: string }> {
    if (!this.usesApiAuth()) {
      return { error: 'Resend verification is only available when the auth API is running locally.' };
    }
    try {
      const res = await this.apiAuth.resendVerification(email.trim());
      return { error: null, message: res.message };
    } catch (err: unknown) {
      return { error: ApiAuthService.formatError(err) };
    }
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    if (this.usesApiAuth()) {
      try {
        const res = await this.apiAuth.login(email, password);
        if (!res.token || !res.user) {
          return { error: { message: res.message || 'Login failed.' } as AuthError };
        }

        if (!res.user.isVerified) {
          return {
            error: {
              message: 'Please verify your email before logging in.',
            } as AuthError,
          };
        }

        this.apiAuth.setToken(res.token);
        this.apiUser.set(res.user);
      } catch (err: unknown) {
        return { error: { message: ApiAuthService.formatError(err) } as AuthError };
      }
    }

    const { error: supabaseError } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (supabaseError) {
      this.apiAuth.setToken(null);
      this.apiUser.set(null);
      return {
        error: {
          message: supabaseError.message || 'Could not sign in.',
        } as AuthError,
      };
    }

    const { data } = await this.supabase.auth.getSession();
    this.session.set(data.session);
    this.user.set(data.session?.user ?? null);

    return { error: null };
  }

  /** Forgot password — Brevo/API locally, Supabase email on production (Vercel). */
  async forgotPassword(email: string): Promise<{ error: string | null; message?: string }> {
    const normalized = email.trim().toLowerCase();
    const genericMessage =
      'If an account exists for this email, a password reset link has been sent.';

    if (environment.useSupabasePasswordReset || !this.usesApiAuth()) {
      try {
        const { error } = await withTimeout(
          this.supabase.auth.resetPasswordForEmail(normalized, {
            redirectTo: this.resetRedirectUrl(),
          }),
          SUPABASE_AUTH_TIMEOUT_MS
        );

        if (error) {
          return { error: error.message };
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '';
        if (msg === 'AUTH_REQUEST_TIMEOUT') {
          // Email may already have been sent even if the client never got a response.
          return { error: null, message: genericMessage };
        }
        return {
          error: err instanceof Error ? err.message : 'Could not send reset email. Please try again.',
        };
      }

      return { error: null, message: genericMessage };
    }

    try {
      const res = await this.apiAuth.forgotPassword(normalized);
      return { error: null, message: res.message || genericMessage };
    } catch (err: unknown) {
      return { error: ApiAuthService.formatError(err) };
    }
  }

  /** Complete reset after Supabase recovery link (production). */
  async resetPasswordWithSupabase(newPassword: string): Promise<{ error: string | null; message?: string }> {
    const { error } = await this.supabase.auth.updateUser({ password: newPassword });
    if (error) {
      return { error: error.message };
    }
    await this.supabase.auth.signOut();
    return { error: null, message: 'Password updated successfully. You can now sign in.' };
  }

  /** Complete reset via API token (local Brevo flow). */
  async resetPassword(token: string, newPassword: string): Promise<{ error: string | null; message?: string }> {
    try {
      const res = await this.apiAuth.resetPassword(token, newPassword);
      return { error: null, message: res.message };
    } catch (err: unknown) {
      return { error: ApiAuthService.formatError(err) };
    }
  }

  /** Exchange PKCE code from Supabase reset email (?code=). */
  async exchangeRecoveryCode(code: string): Promise<{ error: string | null }> {
    const { error } = await this.supabase.auth.exchangeCodeForSession(code);
    return { error: error?.message ?? null };
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
    this.apiAuth.setToken(null);
    this.apiUser.set(null);
    this.session.set(null);
    this.user.set(null);
    this.router.navigate(['/login']);
  }

  get isLoggedIn(): boolean {
    const apiOk = this.apiAuth.getToken() !== null && this.apiUser()?.isVerified === true;
    const supabaseOk = this.session() !== null && Boolean(this.user()?.email_confirmed_at);
    return apiOk || supabaseOk;
  }
}
