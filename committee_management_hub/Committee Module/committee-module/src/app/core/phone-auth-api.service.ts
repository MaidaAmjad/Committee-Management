import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../environments/environment';
import { apiReachabilityHint, apiUrl } from './api-url';
import { ApiUser } from './api-auth.service';

const API_TIMEOUT_MS = 30000;

export interface PhoneOtpSessionResponse {
  success: boolean;
  sessionId: string;
  phone: string;
  expiresInSeconds: number;
  resendCooldownSeconds: number;
  maxResends: number;
  message?: string;
  resendCount?: number;
  token?: string;
  user?: ApiUser;
}

@Injectable({ providedIn: 'root' })
export class PhoneAuthApiService {
  private readonly baseUrl = apiUrl('/api/auth/phone');

  constructor(private http: HttpClient) {}

  private post<T>(path: string, body: unknown): Promise<T> {
    return firstValueFrom(
      this.http.post<T>(`${this.baseUrl}${path}`, body).pipe(timeout(API_TIMEOUT_MS))
    );
  }

  static formatError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) {
        return `Cannot reach the auth API (${apiReachabilityHint()}). Start the API server.`;
      }
      const apiMsg = err.error?.message;
      if (typeof apiMsg === 'string' && apiMsg) return apiMsg;
    }
    if (err instanceof Error && err.message) return err.message;
    return 'Request failed. Please try again.';
  }

  initSignup(payload: {
    phone: string;
    password: string;
    fullName: string;
    email?: string;
  }): Promise<PhoneOtpSessionResponse> {
    return this.post('/signup/init', payload);
  }

  recordResend(sessionId: string): Promise<PhoneOtpSessionResponse> {
    return this.post('/signup/resend', { sessionId });
  }

  completeSignup(sessionId: string, idToken: string, password: string): Promise<PhoneOtpSessionResponse> {
    return this.post('/signup/complete', { sessionId, idToken, password });
  }

  login(phone: string, password: string): Promise<PhoneOtpSessionResponse> {
    return this.post('/login', { phone, password });
  }

  initForgot(phone: string): Promise<PhoneOtpSessionResponse> {
    return this.post('/forgot/init', { phone });
  }

  verifyForgotOtp(sessionId: string, idToken: string): Promise<PhoneOtpSessionResponse> {
    return this.post('/forgot/verify', { sessionId, idToken });
  }

  completeForgotReset(sessionId: string, idToken: string, newPassword: string): Promise<PhoneOtpSessionResponse> {
    return this.post('/forgot/complete', { sessionId, idToken, newPassword });
  }
}
