import { environment } from '../../environments/environment';

/** Express API origin. Empty in local dev → requests use `/api/...` via ng serve proxy. */
export function getApiOrigin(): string {
  return (environment.apiUrl || '').replace(/\/$/, '');
}

/** Production builds need a public API URL; local dev uses the ng serve proxy when empty. */
export function canReachAuthApi(): boolean {
  if (!environment.production) return true;
  return Boolean(environment.apiUrl?.trim());
}

export function authApiNotConfiguredMessage(): string {
  return (
    'The auth API is not configured for production. Deploy the Express server (server/) to a host ' +
    '(Railway, Render, Fly.io, etc.), then set apiUrl in src/environments/environment.prod.ts ' +
    'to that URL and redeploy the Angular app.'
  );
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
