import bcrypt from 'bcryptjs';
import { AppError } from '../utils/AppError.js';
import { generateSecureToken, hashToken } from '../utils/tokens.js';
import { env } from '../config/env.js';
import { sendVerificationEmail, sendPasswordResetEmail } from './email.service.js';
import { signAccessToken } from './jwt.service.js';
import {
  createSupabaseUser,
  confirmSupabaseEmail,
  updateSupabasePassword,
  signInWithSupabase,
  getSupabaseAuthUserById,
  getProfileById,
  isSupabaseEmailConfirmed,
} from './supabase-sync.service.js';
import * as userRepo from '../repositories/user.repository.js';

const SALT_ROUNDS = 12;

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export async function registerUser({ email, password, fullName, phone }) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!password || password.length < 8) {
    throw new AppError('Password must be at least 8 characters.', 400);
  }

  const existing = await userRepo.findByEmail(normalizedEmail);
  if (existing) {
    throw new AppError('An account with this email already exists.', 409);
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const rawVerificationToken = generateSecureToken();

  let user = await userRepo.createUser({
    email: normalizedEmail,
    passwordHash: hashedPassword,
    fullName: fullName.trim(),
    phone: phone?.trim() || null,
    verificationToken: hashToken(rawVerificationToken),
    verificationTokenExpires: addHours(new Date(), env.emailVerificationExpiresHours),
  });

  const supabaseUserId = await createSupabaseUser({
    email: normalizedEmail,
    password,
    fullName: user.fullName,
    phone: user.phone,
  });

  if (supabaseUserId) {
    user = await userRepo.updateUser(user.id, { supabaseUserId });
  }

  await sendVerificationEmail(user, rawVerificationToken);

  return {
    message: 'Registration successful. Please check your email to verify your account.',
    user: userRepo.toPublicJSON(user),
  };
}

export async function verifyEmail(rawToken) {
  const hashed = hashToken(rawToken);
  const user = await userRepo.findByVerificationToken(hashed);

  if (!user) {
    throw new AppError('Invalid or expired verification link.', 400);
  }

  const updated = await userRepo.updateUser(user.id, {
    isVerified: true,
    verificationToken: null,
    verificationTokenExpires: null,
  });

  await confirmSupabaseEmail(updated.supabaseUserId);

  return {
    message: 'Email verified successfully. You can now sign in.',
    user: userRepo.toPublicJSON(updated),
  };
}

async function syncUserFromSupabase(supabaseUser, password) {
  const normalizedEmail = (supabaseUser.email || '').trim().toLowerCase();
  const profile = await getProfileById(supabaseUser.id);
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const isVerified = isSupabaseEmailConfirmed(supabaseUser);
  const fullName =
    profile?.full_name ||
    supabaseUser.user_metadata?.full_name ||
    normalizedEmail.split('@')[0] ||
    'User';

  let user =
    (await userRepo.findByEmail(normalizedEmail)) ||
    (await userRepo.findBySupabaseUserId(supabaseUser.id));

  if (user) {
    user = await userRepo.updateUser(user.id, {
      passwordHash,
      isVerified,
      supabaseUserId: supabaseUser.id,
      fullName,
      phone: profile?.phone ?? user.phone,
    });
  } else {
    user = await userRepo.createUser({
      email: normalizedEmail,
      passwordHash,
      fullName,
      phone: profile?.phone ?? null,
      isVerified,
      supabaseUserId: supabaseUser.id,
    });
  }

  return user;
}

async function ensureVerified(user) {
  if (user.isVerified) return user;

  if (user.supabaseUserId) {
    const sbUser = await getSupabaseAuthUserById(user.supabaseUserId);
    if (isSupabaseEmailConfirmed(sbUser)) {
      return userRepo.updateUser(user.id, { isVerified: true });
    }
  }

  throw new AppError(
    'Please verify your email before logging in. Check your inbox for the verification link.',
    403
  );
}

export async function loginUser({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  let user = await userRepo.findByEmail(normalizedEmail);

  if (user) {
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      const { user: sbUser, error } = await signInWithSupabase(normalizedEmail, password);
      if (error || !sbUser) {
        throw new AppError('Invalid email or password.', 401);
      }
      user = await syncUserFromSupabase(sbUser, password);
    }
  } else {
    const { user: sbUser, error } = await signInWithSupabase(normalizedEmail, password);
    if (error || !sbUser) {
      throw new AppError('Invalid email or password.', 401);
    }
    user = await syncUserFromSupabase(sbUser, password);
  }

  user = await ensureVerified(user);

  const token = signAccessToken(user);

  return {
    message: 'Login successful.',
    token,
    user: userRepo.toPublicJSON(user),
  };
}

export async function forgotPassword(email) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await userRepo.findByEmail(normalizedEmail);

  const genericMessage =
    'If an account exists for this email, a password reset link has been sent.';

  if (!user) {
    return { message: genericMessage };
  }

  const rawResetToken = generateSecureToken();
  await userRepo.updateUser(user.id, {
    resetPasswordToken: hashToken(rawResetToken),
    resetPasswordTokenExpires: addHours(new Date(), env.passwordResetExpiresHours).toISOString(),
  });

  await sendPasswordResetEmail(user, rawResetToken);

  return { message: genericMessage };
}

export async function resetPassword({ token, newPassword }) {
  if (!newPassword || newPassword.length < 8) {
    throw new AppError('Password must be at least 8 characters.', 400);
  }

  const hashed = hashToken(token);
  const user = await userRepo.findByResetToken(hashed);

  if (!user) {
    throw new AppError('Invalid or expired reset link.', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await userRepo.updateUser(user.id, {
    passwordHash,
    resetPasswordToken: null,
    resetPasswordTokenExpires: null,
  });

  await updateSupabasePassword(user.supabaseUserId, newPassword);

  return { message: 'Password updated successfully. You can now sign in with your new password.' };
}

export async function getUserById(userId) {
  const user = await userRepo.findById(userId);
  if (!user) {
    throw new AppError('User not found.', 404);
  }
  return userRepo.toPublicJSON(user);
}
