import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

export function isCaptchaConfigured() {
  return Boolean(env.recaptchaSecretKey);
}

export function isCaptchaRequired() {
  if (!isCaptchaConfigured()) {
    return env.nodeEnv === 'production';
  }
  return true;
}

/** Verify Google reCAPTCHA v2 response token. */
export async function verifyRecaptchaToken(token) {
  if (!isCaptchaRequired()) {
    return;
  }

  if (!token?.trim() || token.trim() === 'dev-bypass') {
    throw new AppError('Complete the security check (CAPTCHA) before continuing.', 400);
  }

  if (!isCaptchaConfigured()) {
    if (env.captchaDevBypass) {
      console.warn('CAPTCHA dev bypass: RECAPTCHA_SECRET_KEY not set.');
      return;
    }
    throw new AppError(
      'Security check is not configured on the server. Add RECAPTCHA_SECRET_KEY to server/.env.',
      503
    );
  }

  const params = new URLSearchParams({
    secret: env.recaptchaSecretKey,
    response: token.trim(),
  });

  const response = await fetch(VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!response.ok) {
    throw new AppError('Could not verify security check. Try again.', 502);
  }

  const data = await response.json();
  if (!data.success) {
    const codes = (data['error-codes'] || []).join(', ');
    console.warn('reCAPTCHA verification failed:', codes);
    throw new AppError(
      'Security check failed or expired. Complete CAPTCHA again and retry.',
      400
    );
  }
}
