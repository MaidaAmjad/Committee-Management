import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseClient, Session, User, AuthError } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { ApiAuthService, ApiUser } from './api-auth.service';

export interface AuthResult {
  error: AuthError | { message: string } | null;
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

  private async bootstrapAuth(): Promise<void> {
    try {
      const token = this.apiAuth.getToken();
      if (token) {
        const me = await this.apiAuth.me();
        this.apiUser.set(me);
        await this.restoreSupabaseSession();
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

  private async restoreSupabaseSession(): Promise<void> {
    const { data } = await this.supabase.auth.getSession();
    if (data.session) return;
  }

  async signUp(email: string, password: string, fullName: string, phone?: string): Promise<AuthResult> {
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
      return { error: null };
    } catch (err: any) {
      const message = err?.error?.message || err?.message || 'Registration failed.';
      return { error: { message } as AuthError };
    }
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
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

      const { error: supabaseError } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (supabaseError) {
        this.apiAuth.setToken(null);
        this.apiUser.set(null);
        return {
          error: {
            message: supabaseError.message || 'Could not start your committee session.',
          } as AuthError,
        };
      }

      const { data } = await this.supabase.auth.getSession();
      this.session.set(data.session);
      this.user.set(data.session?.user ?? null);

      return { error: null };
    } catch (err: unknown) {
      return { error: { message: ApiAuthService.formatError(err) } as AuthError };
    }
  }

  async forgotPassword(email: string): Promise<{ error: string | null; message?: string }> {
    try {
      const res = await this.apiAuth.forgotPassword(email);
      return { error: null, message: res.message };
    } catch (err: unknown) {
      return { error: ApiAuthService.formatError(err) };
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<{ error: string | null; message?: string }> {
    try {
      const res = await this.apiAuth.resetPassword(token, newPassword);
      return { error: null, message: res.message };
    } catch (err: unknown) {
      return { error: ApiAuthService.formatError(err) };
    }
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
