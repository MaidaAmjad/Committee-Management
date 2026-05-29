import { environment } from '../../environments/environment';

/** Express API origin. Empty in local dev → requests use `/api/...` via ng serve proxy. */
export function getApiOrigin(): string {
  return (environment.apiUrl || '').replace(/\/$/, '');
}

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const origin = getApiOrigin();
  return origin ? `${origin}${normalized}` : normalized;
}

export function apiReachabilityHint(): string {
  const origin = getApiOrigin();
  return origin || 'http://localhost:4200 (proxied to the API on port 3000)';
}
