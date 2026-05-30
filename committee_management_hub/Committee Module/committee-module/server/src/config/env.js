import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function rejectPlaceholder(name, value) {
  const placeholders = ['your-service-role-key', 'your-brevo-api-key', 'your-project.supabase.co'];
  if (placeholders.some((p) => value.includes(p))) {
    throw new Error(
      `${name} is still a placeholder. Edit server/.env (not .env.example) with your real value.`
    );
  }
}

const supabaseServiceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
rejectPlaceholder('SUPABASE_SERVICE_ROLE_KEY', supabaseServiceRoleKey);

const brevoApiKey = process.env.BREVO_API_KEY?.trim() || '';
const brevoSenderEmail = process.env.BREVO_SENDER_EMAIL?.trim() || '';

export const env = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: requireEnv('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  brevoApiKey,
  brevoSenderEmail,
  brevoSenderName: process.env.BREVO_SENDER_NAME || 'TrustCom',
  clientUrl: (process.env.CLIENT_URL || 'http://localhost:4200').replace(/\/$/, ''),
  apiUrl: (process.env.API_URL || 'http://localhost:3000').replace(/\/$/, ''),
  emailVerificationExpiresHours: Number(process.env.EMAIL_VERIFICATION_EXPIRES_HOURS) || 24,
  passwordResetExpiresHours: Number(process.env.PASSWORD_RESET_EXPIRES_HOURS) || 1,
  /** When true, show on-screen verify link if Brevo and Supabase email both fail (local dev). */
  emailDevBypass: process.env.EMAIL_DEV_BYPASS === 'true' || (process.env.EMAIL_DEV_BYPASS !== 'false' && process.env.NODE_ENV === 'development'),
  supabaseUrl: requireEnv('SUPABASE_URL'),
  supabaseServiceRoleKey,
  supabaseAnonKey: requireEnv('SUPABASE_ANON_KEY'),
  adminEmail: (process.env.ADMIN_EMAIL || 'maidaamjad32@gmail.com').trim().toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD || 'maida0123',
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID?.trim() || '',
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL?.trim() || '',
  firebasePrivateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim(),
  otpExpiresMinutes: Number(process.env.OTP_EXPIRES_MINUTES) || 5,
  otpMaxResends: Number(process.env.OTP_MAX_RESENDS) || 3,
  otpResendCooldownSeconds: Number(process.env.OTP_RESEND_COOLDOWN_SECONDS) || 60,
  recaptchaSecretKey: process.env.RECAPTCHA_SECRET_KEY?.trim() || '',
  /** Allow auth without server CAPTCHA when secret is unset (local dev only). */
  captchaDevBypass:
    process.env.CAPTCHA_DEV_BYPASS === 'true' ||
    (process.env.CAPTCHA_DEV_BYPASS !== 'false' &&
      process.env.NODE_ENV !== 'production' &&
      !process.env.RECAPTCHA_SECRET_KEY?.trim()),
};
