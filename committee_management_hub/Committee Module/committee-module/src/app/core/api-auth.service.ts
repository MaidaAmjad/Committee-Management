import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../environments/environment';
import { apiReachabilityHint, apiUrl } from './api-url';

const API_TIMEOUT_MS = 30000;

export interface ApiUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  isVerified: boolean;
  supabaseUserId: string | null;
  createdAt: string;
}

export interface AuthApiResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: ApiUser;
  verificationResent?: boolean;
  devEmailBypass?: boolean;
  devVerifyUrl?: string | null;
}

const TOKEN_KEY = 'trustcom_auth_token';

@Injectable({ providedIn: 'root' })
export class ApiAuthService {
  private readonly baseUrl = apiUrl('/api/auth');

  constructor(private http: HttpClient) {}

  private post<T>(path: string, body: unknown): Promise<T> {
    if (environment.production && !environment.apiUrl?.trim()) {
      return Promise.reject(new Error('Auth API is not configured for this environment.'));
    }
    return firstValueFrom(
      this.http.post<T>(`${this.baseUrl}${path}`, body).pipe(timeout(API_TIMEOUT_MS))
    );
  }

  /** User-friendly message when the API cannot be reached. */
  static formatError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) {
        return `Cannot reach the auth API (${apiReachabilityHint()}). Start the API: cd server && npm run dev, then restart ng serve.`;
      }
      const apiMsg = err.error?.message;
      if (typeof apiMsg === 'string' && apiMsg) return apiMsg;
    }
    if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'TimeoutError') {
      return `Request timed out. Is the API running? (${apiReachabilityHint()})`;
    }
    if (err instanceof Error && err.message) return err.message;
    return 'Request failed. Please try again.';
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  setToken(token: string | null): void {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  async register(payload: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
  }): Promise<AuthApiResponse> {
    return this.post<AuthApiResponse>('/register', payload);
  }

  async resendVerification(email: string): Promise<AuthApiResponse> {
    return this.post<AuthApiResponse>('/resend-verification', { email });
  }

  async login(email: string, password: string): Promise<AuthApiResponse> {
    return this.post<AuthApiResponse>('/login', { email, password });
  }

  async forgotPassword(email: string): Promise<AuthApiResponse> {
    return this.post<AuthApiResponse>('/forgot-password', { email });
  }

  async resetPassword(token: string, newPassword: string): Promise<AuthApiResponse> {
    return this.post<AuthApiResponse>('/reset-password', { token, newPassword });
  }

  async me(): Promise<ApiUser> {
    const token = this.getToken();
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; user: ApiUser }>(`${this.baseUrl}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    );
    return res.user;
  }
}
