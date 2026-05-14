import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseClient, Session, User, AuthError } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

export interface AuthResult {
  error: AuthError | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabase: SupabaseClient;

  session = signal<Session | null>(null);
  user    = signal<User | null>(null);

  /** Resolves once the initial session has been loaded from storage */
  readonly ready: Promise<void>;
  private _resolveReady!: () => void;

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {
    this.supabase = this.supabaseService.client;

    // Create the ready promise before anything async
    this.ready = new Promise(resolve => { this._resolveReady = resolve; });

    // Restore session on app load — resolves `ready` when done
    this.supabase.auth.getSession().then(({ data }) => {
      this.session.set(data.session);
      this.user.set(data.session?.user ?? null);
      this._resolveReady();
    });

    // Keep signals in sync on any auth event (login, logout, token refresh)
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.session.set(session);
      this.user.set(session?.user ?? null);
    });
  }

  async signUp(email: string, password: string, fullName: string, phone?: string): Promise<AuthResult> {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          ...(phone?.trim() ? { phone: phone.trim() } : {}),
        },
      },
    });
    if (error) return { error };

    // If email confirmation is off, session exists — mirror contact fields to profiles for /user/:id & WhatsApp.
    if (data.user?.id && data.session) {
      const updates: Record<string, string> = {};
      if (fullName?.trim()) updates['full_name'] = fullName.trim();
      if (phone?.trim()) updates['phone'] = phone.trim();
      if (Object.keys(updates).length > 0) {
        const { error: pe } = await this.supabase.from('profiles').update(updates).eq('id', data.user.id);
        if (pe) console.warn('Profile sync after signup:', pe.message);
      }
    }
    return { error: null };
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    const { error } = await this.supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
    this.session.set(null);
    this.user.set(null);
    this.router.navigate(['/signup']);
  }

  get isLoggedIn(): boolean {
    return this.session() !== null;
  }
}
