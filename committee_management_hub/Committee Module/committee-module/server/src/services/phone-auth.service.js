import bcrypt from 'bcryptjs';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';
import { isFirebaseConfigured, verifyFirebaseIdToken } from '../config/firebase-admin.js';
import { normalizePhone, isValidE164 } from '../utils/phone.js';
import * as pendingRepo from '../repositories/pending-otp.repository.js';
import * as userRepo from '../repositories/user.repository.js';
import { signAccessToken } from './jwt.service.js';
import { createSupabaseUser, ensurePhoneSupabaseAccount } from './supabase-sync.service.js';
import { purgeUnverifiedAuthByPhone } from './user-deletion.service.js';
import { assertEmailNotSuspended, isEmailSuspended } from './user-suspension.service.js';

const SALT_ROUNDS = 12;

function sessionExpiryDate() {
  return new Date(Date.now() + env.otpExpiresMinutes * 60 * 1000);
}

function assertFirebaseReady() {
  if (!isFirebaseConfigured()) {
    throw new AppError(
      'Phone OTP is not configured. Add Firebase Admin credentials to server/.env and enable Phone Auth in Firebase Console.',
      503
    );
  }
}

function assertSessionActive(session) {
  if (!session) throw new AppError('OTP session not found or expired. Please start again.', 400);
  if (session.expiresAt.getTime() < Date.now()) {
    throw new AppError('OTP session expired. Please sign up again.', 400);
  }
}

function assertPhoneMatches(session, verifiedPhone) {
  if (normalizePhone(session.phone) !== normalizePhone(verifiedPhone)) {
    throw new AppError('Phone number does not match the verification session.', 400);
  }
}

function syntheticEmail(phone) {
  const digits = phone.replace(/\D/g, '');
  return `${digits}@phone.trustcom.app`;
}

/** Step 1: Store signup data; user row is NOT created until OTP succeeds. */
export async function initSignup({ phone, password, fullName, email }) {
  assertFirebaseReady();

  const normalizedPhone = normalizePhone(phone);
  if (!isValidE164(normalizedPhone)) {
    throw new AppError('Enter a valid mobile number with country code.', 400);
  }
  if (!password || password.length < 8) {
    throw new AppError('Password must be at least 8 characters.', 400);
  }
  if (!fullName?.trim()) {
    throw new AppError('Full name is required.', 400);
  }

  const normalizedEmail = (email?.trim() || syntheticEmail(normalizedPhone)).toLowerCase();
  await assertEmailNotSuspended(normalizedEmail);

  await purgeUnverifiedAuthByPhone(normalizedPhone);

  const existingPhone = await userRepo.findByPhone(normalizedPhone);
  if (existingPhone?.phoneVerified) {
    throw new AppError('An account with this phone number already exists. Please sign in.', 409);
  }

  const existingEmail = await userRepo.findByEmail(normalizedEmail);
  if (existingEmail?.phoneVerified || existingEmail?.isVerified) {
    throw new AppError('An account with this email already exists. Please sign in.', 409);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const session = await pendingRepo.createSession({
    purpose: 'signup',
    phone: normalizedPhone,
    passwordHash,
    fullName: fullName.trim(),
    email: normalizedEmail,
    expiresAt: sessionExpiryDate(),
  });

  return {
    sessionId: session.id,
    phone: normalizedPhone,
    expiresInSeconds: env.otpExpiresMinutes * 60,
    resendCooldownSeconds: env.otpResendCooldownSeconds,
    maxResends: env.otpMaxResends,
    message: 'OTP session started. Verify your phone to activate your account.',
  };
}

/** Track resend attempts (client sends OTP via Firebase). */
export async function recordOtpResend(sessionId) {
  assertFirebaseReady();
  const session = await pendingRepo.findById(sessionId);
  assertSessionActive(session);

  if (session.resendCount >= env.otpMaxResends) {
    throw new AppError('Maximum OTP resend attempts reached. Please start signup again.', 429);
  }

  const updated = await pendingRepo.incrementResend(sessionId, session.resendCount + 1);
  return {
    resendCount: updated.resendCount,
    maxResends: env.otpMaxResends,
    resendCooldownSeconds: env.otpResendCooldownSeconds,
  };
}

/** Step 2: Verify Firebase OTP token and create the user account. */
export async function completeSignup({ sessionId, idToken, password }) {
  assertFirebaseReady();
  if (!password || password.length < 8) {
    throw new AppError('Password must be at least 8 characters.', 400);
  }

  const session = await pendingRepo.findById(sessionId);
  assertSessionActive(session);
  if (session.purpose !== 'signup') {
    throw new AppError('Invalid OTP session.', 400);
  }

  const match = await bcrypt.compare(password, session.passwordHash);
  if (!match) {
    throw new AppError('Invalid signup session.', 400);
  }

  const { phone: verifiedPhone } = await verifyFirebaseIdToken(idToken);
  assertPhoneMatches(session, verifiedPhone);

  const existing = await userRepo.findByPhone(session.phone);
  if (existing?.phoneVerified) {
    await pendingRepo.deleteById(sessionId);
    throw new AppError('An account with this phone number already exists. Please sign in.', 409);
  }

  let user = await userRepo.createUser({
    email: session.email,
    passwordHash: session.passwordHash,
    fullName: session.fullName,
    phone: session.phone,
    isVerified: true,
    phoneVerified: true,
  });

  const ensured = await ensurePhoneSupabaseAccount({
    email: session.email,
    password,
    fullName: session.fullName,
    phone: session.phone,
    supabaseUserId: null,
  });

  if (ensured.supabaseUserId) {
    const patch = { supabaseUserId: ensured.supabaseUserId };
    if (ensured.email !== user.email) patch.email = ensured.email;
    user = await userRepo.updateUser(user.id, patch);
  }

  await pendingRepo.deleteById(sessionId);

  const token = signAccessToken(user);
  return {
    message: 'Phone verified. Your account is now active.',
    token,
    user: userRepo.toPublicJSON(user),
  };
}

/** Login with phone + password; only phone-verified users. */
export async function loginWithPhone({ phone, password }) {
  const normalizedPhone = normalizePhone(phone);
  if (!isValidE164(normalizedPhone)) {
    throw new AppError('Enter a valid mobile number.', 400);
  }

  const user = await userRepo.findByPhone(normalizedPhone);
  if (!user) {
    throw new AppError('Invalid phone number or password.', 401);
  }

  if (user.isSuspended) {
    throw new AppError('Your account has been suspended. Contact support.', 403);
  }

  if (!user.phoneVerified && !user.isVerified) {
    throw new AppError('Please verify your phone number before logging in.', 403);
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    throw new AppError('Invalid phone number or password.', 401);
  }

  const ensured = await ensurePhoneSupabaseAccount({
    email: user.email,
    password,
    fullName: user.fullName,
    phone: user.phone,
    supabaseUserId: user.supabaseUserId,
  });

  if (ensured.supabaseUserId) {
    const patch = { supabaseUserId: ensured.supabaseUserId };
    if (ensured.email !== user.email) patch.email = ensured.email;
    user = await userRepo.updateUser(user.id, patch);
  }

  const token = signAccessToken(user);
  return {
    message: 'Login successful.',
    token,
    user: userRepo.toPublicJSON(user),
  };
}

/** Forgot password — step 1: start OTP session for registered phone. */
export async function initPasswordReset({ phone }) {
  assertFirebaseReady();
  const normalizedPhone = normalizePhone(phone);
  if (!isValidE164(normalizedPhone)) {
    throw new AppError('Enter a valid mobile number.', 400);
  }

  const user = await userRepo.findByPhone(normalizedPhone);
  if (!user?.phoneVerified && !user?.isVerified) {
    return {
      message: 'If an account exists for this phone, an OTP has been sent.',
      sessionId: null,
      maskedPhone: null,
    };
  }

  if (user.isSuspended) {
    throw new AppError('This account is suspended. Contact support.', 403);
  }

  const session = await pendingRepo.createSession({
    purpose: 'password_reset',
    phone: normalizedPhone,
    userId: user.id,
    expiresAt: sessionExpiryDate(),
  });

  return {
    sessionId: session.id,
    phone: normalizedPhone,
    expiresInSeconds: env.otpExpiresMinutes * 60,
    resendCooldownSeconds: env.otpResendCooldownSeconds,
    maxResends: env.otpMaxResends,
    message: 'If an account exists for this phone, an OTP has been sent.',
  };
}

/** Forgot password — step 2: verify OTP (returns resetToken for step 3). */
export async function verifyPasswordResetOtp({ sessionId, idToken }) {
  assertFirebaseReady();
  const session = await pendingRepo.findById(sessionId);
  assertSessionActive(session);
  if (session.purpose !== 'password_reset') {
    throw new AppError('Invalid reset session.', 400);
  }

  const { phone: verifiedPhone } = await verifyFirebaseIdToken(idToken);
  assertPhoneMatches(session, verifiedPhone);

  return {
    sessionId: session.id,
    message: 'Phone verified. You can set a new password.',
  };
}

/** Forgot password — step 3: set new password after OTP verified. */
export async function completePasswordReset({ sessionId, idToken, newPassword }) {
  assertFirebaseReady();
  if (!newPassword || newPassword.length < 8) {
    throw new AppError('Password must be at least 8 characters.', 400);
  }

  const session = await pendingRepo.findById(sessionId);
  assertSessionActive(session);
  if (session.purpose !== 'password_reset') {
    throw new AppError('Invalid reset session.', 400);
  }

  const { phone: verifiedPhone } = await verifyFirebaseIdToken(idToken);
  assertPhoneMatches(session, verifiedPhone);

  const user = await userRepo.findById(session.userId);
  if (!user) {
    throw new AppError('User not found.', 404);
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await userRepo.updateUser(user.id, { passwordHash });
  await pendingRepo.deleteById(sessionId);

  return { message: 'Password updated successfully. You can now sign in.' };
}

export async function checkPhoneAvailable(phone) {
  const normalizedPhone = normalizePhone(phone);
  const user = await userRepo.findByPhone(normalizedPhone);
  return { available: !(user?.phoneVerified || user?.isVerified) };
}
