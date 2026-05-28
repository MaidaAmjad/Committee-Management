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

export const env = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: requireEnv('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  brevoApiKey: requireEnv('BREVO_API_KEY'),
  brevoSenderEmail: requireEnv('BREVO_SENDER_EMAIL'),
  brevoSenderName: process.env.BREVO_SENDER_NAME || 'TrustCom',
  clientUrl: (process.env.CLIENT_URL || 'http://localhost:4200').replace(/\/$/, ''),
  apiUrl: (process.env.API_URL || 'http://localhost:3000').replace(/\/$/, ''),
  emailVerificationExpiresHours: Number(process.env.EMAIL_VERIFICATION_EXPIRES_HOURS) || 24,
  passwordResetExpiresHours: Number(process.env.PASSWORD_RESET_EXPIRES_HOURS) || 1,
  /** When true, log verify/reset links to the server console if Brevo fails (local dev). */
  emailDevBypass: process.env.EMAIL_DEV_BYPASS === 'true' || process.env.NODE_ENV === 'development',
  supabaseUrl: requireEnv('SUPABASE_URL'),
  supabaseServiceRoleKey,
  supabaseAnonKey: requireEnv('SUPABASE_ANON_KEY'),
};
