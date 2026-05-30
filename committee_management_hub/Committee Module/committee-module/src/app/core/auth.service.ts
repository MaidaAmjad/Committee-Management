import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseClient, Session, User, AuthError } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { ApiAuthService, ApiUser } from './api-auth.service';
import { PhoneAuthApiService } from './phone-auth-api.service';
import { FirebaseEmailService } from './firebase-email.service';
import { FirebaseEmailApiService } from './firebase-email-api.service';
import { environment } from '../../environments/environment';
import { authApiNotConfiguredMessage, canReachAuthApi } from './api-url';

export interface AuthResult {
  error: AuthError | { message: string } | null;
}

export interface SignUpResult extends AuthResult {
  message?: string;
  verificationResent?: boolean;
  devVerifyUrl?: string | null;
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

  /** Prefer API auth (phone/email JWT); fall back to Supabase session metadata. */
  displayName = computed(() => {
    const api = this.apiUser();
    if (api?.fullName?.trim()) return api.fullName.trim();
    const u = this.user();
    return u?.user_metadata?.['full_name'] || u?.email?.split('@')[0] || 'User';
  });

  displayEmail = computed(() => {
    const api = this.apiUser();
    if (api?.email && !api.email.endsWith('@phone.trustcom.local') && !api.email.endsWith('@phone.trustcom.app')) {
      return api.email;
    }
    if (api?.phone) return api.phone;
    return this.user()?.email || '';
  });

  readonly ready: Promise<void>;
  private _resolveReady!: () => void;

  constructor(
    private supabaseService: SupabaseService,
    private apiAuth: ApiAuthService,
    private phoneAuthApi: PhoneAuthApiService,
    private firebaseEmail: FirebaseEmailService,
    private firebaseEmailApi: FirebaseEmailApiService,
    private router: Router
  ) {
    this.supabase = this.supabaseService.client;
    this.ready = new Promise(resolve => { this._resolveReady = resolve; });

    this.bootstrapAuth();
  }

  private usesApiAuth(): boolean {
    if (environment.apiUrl?.includes('your-api-domain')) return false;
    if (environment.useSupabasePasswordReset && environment.production) return false;
    return canReachAuthApi();
  }

  private useFirebaseEmail(): boolean {
    return (
      environment.useFirebaseEmailVerification !== false && this.firebaseEmail.isConfigured()
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
    const sessionUser = data.session?.user ?? null;
    const api = this.apiUser();

    if (api?.supabaseUserId && sessionUser && sessionUser.id !== api.supabaseUserId) {
      await this.supabase.auth.signOut();
      this.session.set(null);
      this.user.set(null);
    } else {
      this.session.set(data.session);
      this.user.set(sessionUser);
    }

    if (api && (!this.user()?.id || this.user()?.id !== api.supabaseUserId)) {
      await this.restoreSupabaseSessionFromApi();
    }

    this._resolveReady();

    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.session.set(session);
      this.user.set(session?.user ?? null);
    });
  }

  async signUp(
    email: string,
    password: string,
    fullName: string,
    phone?: string,
    captchaToken?: string
  ): Promise<SignUpResult> {
    if (!this.useFirebaseEmail() && !this.usesApiAuth()) {
      return {
        error: {
          message: authApiNotConfiguredMessage(),
        } as AuthError,
      };
    }

    const token = captchaToken?.trim() || 'dev-bypass';
    if (canReachAuthApi() && token !== 'dev-bypass') {
      try {
        await this.apiAuth.verifyCaptcha(token);
      } catch (err: unknown) {
        return { error: { message: ApiAuthService.formatError(err) } as AuthError };
      }
    }

    if (this.useFirebaseEmail()) {
      try {
        await this.firebaseEmail.signUp(email, password, fullName);
        FirebaseEmailService.saveSignupProfile({
          fullName: fullName.trim(),
          phone: phone?.trim() || undefined,
        });
        return {
          error: null,
          message:
            'Account created! We sent a verification email from Firebase — check your inbox and spam folder, then sign in.',
        };
      } catch (err: unknown) {
        return {
          error: {
            message: err instanceof Error ? err.message : 'Registration failed.',
          } as AuthError,
        };
      }
    }

    try {
      const res = await this.apiAuth.register({
        email,
        password,
        fullName,
        phone: phone?.trim() || undefined,
        captchaToken: token,
      });
      if (!res.success) {
        return { error: { message: res.message || 'Registration failed.' } as AuthError };
      }
      return {
        error: null,
        message: res.message,
        verificationResent: res.verificationResent === true,
        devVerifyUrl: res.devVerifyUrl ?? null,
      };
    } catch (err: unknown) {
      return { error: { message: ApiAuthService.formatError(err) } as AuthError };
    }
  }

  async resendVerificationEmail(
    email: string,
    password?: string
  ): Promise<{ error: string | null; message?: string }> {
    if (this.useFirebaseEmail()) {
      try {
        if (password?.trim()) {
          await this.firebaseEmail.resendWithPassword(email, password);
        } else {
          await this.firebaseEmail.resendVerificationEmail();
        }
        return {
          error: null,
          message: 'Verification email sent. Check your inbox and spam folder.',
        };
      } catch (err: unknown) {
        return {
          error: err instanceof Error ? err.message : 'Could not resend verification email.',
        };
      }
    }

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

  setApiSession(token: string, user: ApiUser): void {
    this.apiAuth.setToken(token);
    this.apiUser.set(user);
  }

  /** Sign into Supabase so profiles/committees/payments use the same account as the API JWT. */
  async syncSupabaseSession(
    email: string,
    password: string,
    supabaseUserId?: string | null
  ): Promise<{ error: string | null }> {
    const normalizedEmail = email.trim().toLowerCase();
    const current = this.user();

    if (current && supabaseUserId && current.id !== supabaseUserId) {
      await this.supabase.auth.signOut();
      this.session.set(null);
      this.user.set(null);
    } else if (current?.id === supabaseUserId) {
      return { error: null };
    }

    const { error } = await this.supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (!error) {
      const { data } = await this.supabase.auth.getSession();
      this.session.set(data.session);
      this.user.set(data.session?.user ?? null);
      return { error: null };
    }

    const restored = await this.restoreSupabaseSessionFromApi();
    if (restored) return { error: null };

    return {
      error:
        'Could not connect your app session. Sign out and sign in again, or contact support if this continues.',
    };
  }

  /** Restore Supabase session from API JWT (payments, committees, profiles). */
  async ensureSupabaseSession(): Promise<boolean> {
    if (this.user()?.id) return true;
    return this.restoreSupabaseSessionFromApi();
  }

  private async restoreSupabaseSessionFromApi(): Promise<boolean> {
    if (!this.usesApiAuth() || !this.apiAuth.getToken()) return false;

    try {
      const session = await this.apiAuth.fetchSupabaseSession();
      if (!session?.access_token || !session?.refresh_token) return false;

      const { error } = await this.supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      if (error) return false;

      const { data } = await this.supabase.auth.getSession();
      this.session.set(data.session);
      this.user.set(data.session?.user ?? null);
      return Boolean(data.session?.user);
    } catch (err) {
      console.warn('Supabase session restore failed:', err);
      return false;
    }
  }

  /** Phone + password login (Firebase-verified accounts only). */
  async signInWithPhone(phone: string, password: string): Promise<AuthResult> {
    if (!this.usesApiAuth()) {
      return { error: { message: 'Phone login requires the auth API.' } as AuthError };
    }
    try {
      const res = await this.phoneAuthApi.login(phone, password);
      if (!res.token || !res.user) {
        return { error: { message: res.message || 'Login failed.' } as AuthError };
      }
      const verified = res.user.phoneVerified ?? res.user.isVerified;
      if (!verified) {
        return {
          error: { message: 'Please verify your phone number before logging in.' } as AuthError,
        };
      }
      this.setApiSession(res.token, res.user);
      const sync = await this.syncSupabaseSession(
        res.user.email,
        password,
        res.user.supabaseUserId
      );
      if (sync.error) {
        return { error: { message: sync.error } as AuthError };
      }
      return { error: null };
    } catch (err: unknown) {
      return { error: { message: PhoneAuthApiService.formatError(err) } as AuthError };
    }
  }

  async signIn(email: string, password: string, captchaToken?: string): Promise<AuthResult> {
    const token = captchaToken?.trim() || 'dev-bypass';

    if (this.useFirebaseEmail()) {
      if (!canReachAuthApi()) {
        return {
          error: {
            message: authApiNotConfiguredMessage(),
          } as AuthError,
        };
      }

      try {
        const fbUser = await this.firebaseEmail.signIn(email, password);
        if (!fbUser.emailVerified) {
          return {
            error: {
              message:
                'Please verify your email before logging in. Check your inbox for the verification link.',
            } as AuthError,
          };
        }

        const profile = FirebaseEmailService.loadSignupProfile();
        const idToken = await fbUser.getIdToken();
        const res = await this.firebaseEmailApi.establish({
          idToken,
          password,
          fullName: profile?.fullName,
          phone: profile?.phone,
          captchaToken: token,
        });

        if (!res.token || !res.user) {
          return { error: { message: res.message || 'Login failed.' } as AuthError };
        }

        this.setApiSession(res.token, res.user);
        FirebaseEmailService.clearSignupProfile();

        const sync = await this.syncSupabaseSession(
          email,
          password,
          res.user.supabaseUserId
        );
        if (sync.error) {
          return { error: { message: sync.error } as AuthError };
        }

        const { data } = await this.supabase.auth.getSession();
        this.session.set(data.session);
        this.user.set(data.session?.user ?? null);
        return { error: null };
      } catch (err: unknown) {
        const message =
          err instanceof Error && err.message && !err.message.includes('Cannot reach the auth API')
            ? err.message
            : FirebaseEmailApiService.formatError(err);
        return { error: { message } as AuthError };
      }
    }

    if (this.usesApiAuth()) {
      try {
        const res = await this.apiAuth.login(email, password, token);
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
    const sessionUser = data.session?.user;

    if (sessionUser) {
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('is_suspended')
        .eq('id', sessionUser.id)
        .maybeSingle();

      if (profile?.is_suspended) {
        await this.supabase.auth.signOut();
        this.apiAuth.setToken(null);
        this.apiUser.set(null);
        this.session.set(null);
        this.user.set(null);
        return {
          error: {
            message:
              'Your account has been suspended. Contact support if you believe this is a mistake.',
          } as AuthError,
        };
      }
    }

    this.session.set(data.session);
    this.user.set(sessionUser ?? null);

    return { error: null };
  }

  /** Forgot password — Firebase email, Brevo/API legacy, or Supabase on production. */
  async forgotPassword(email: string): Promise<{ error: string | null; message?: string }> {
    const normalized = email.trim().toLowerCase();
    const genericMessage =
      'If an account exists for this email, a password reset link has been sent.';

    if (this.useFirebaseEmail()) {
      try {
        await this.firebaseEmail.sendPasswordReset(normalized);
        return { error: null, message: genericMessage };
      } catch (err: unknown) {
        return {
          error: err instanceof Error ? err.message : 'Could not send reset email.',
        };
      }
    }

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

  /** Complete reset after Firebase password-reset email (oobCode in URL). */
  async resetPasswordWithFirebase(
    oobCode: string,
    newPassword: string
  ): Promise<{ error: string | null; message?: string }> {
    try {
      const idToken = await this.firebaseEmail.confirmPasswordReset(oobCode, newPassword);
      const res = await this.firebaseEmailApi.syncPassword(idToken, newPassword);
      await this.firebaseEmail.signOut();
      return { error: null, message: res.message };
    } catch (err: unknown) {
      return {
        error: FirebaseEmailApiService.formatError(err),
      };
    }
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
    const u = this.apiUser();
    const apiOk =
      this.apiAuth.getToken() !== null && Boolean(u?.phoneVerified ?? u?.isVerified);
    const supabaseOk = this.session() !== null && Boolean(this.user()?.email_confirmed_at);
    return apiOk || supabaseOk;
  }
}
