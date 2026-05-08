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
  user = signal<User | null>(null);

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {
    this.supabase = this.supabaseService.client;

    // Restore session on app load
    this.supabase.auth.getSession().then(({ data }) => {
      this.session.set(data.session);
      this.user.set(data.session?.user ?? null);
    });

    // Listen for auth state changes
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.session.set(session);
      this.user.set(session?.user ?? null);
    });
  }

  /** Sign up with email + password */
  async signUp(email: string, password: string, fullName: string): Promise<AuthResult> {
    const { error } = await this.supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { error };
  }

  /** Sign in with email + password */
  async signIn(email: string, password: string): Promise<AuthResult> {
    const { error } = await this.supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  /** Sign out and redirect to signup */
  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
    this.router.navigate(['/signup']);
  }

  get isLoggedIn(): boolean {
    return this.session() !== null;
  }
}
