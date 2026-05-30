import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';
import { ApiAuthService, AuthApiResponse } from './api-auth.service';
import { apiUrl } from './api-url';

const API_TIMEOUT_MS = 30000;

@Injectable({ providedIn: 'root' })
export class FirebaseEmailApiService {
  private readonly baseUrl = apiUrl('/api/auth/firebase-email');

  constructor(private http: HttpClient) {}

  async establish(payload: {
    idToken: string;
    password: string;
    fullName?: string;
    phone?: string;
  }): Promise<AuthApiResponse> {
    return firstValueFrom(
      this.http
        .post<AuthApiResponse>(`${this.baseUrl}/establish`, payload)
        .pipe(timeout(API_TIMEOUT_MS))
    );
  }

  async syncPassword(idToken: string, newPassword: string): Promise<{ success: boolean; message?: string }> {
    return firstValueFrom(
      this.http
        .post<{ success: boolean; message?: string }>(`${this.baseUrl}/sync-password`, {
          idToken,
          newPassword,
        })
        .pipe(timeout(API_TIMEOUT_MS))
    );
  }

  static formatError(err: unknown): string {
    return ApiAuthService.formatError(err);
  }
}
