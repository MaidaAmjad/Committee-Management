import bcrypt from 'bcryptjs';
import { AppError } from '../utils/AppError.js';
import { isFirebaseConfigured, verifyFirebaseEmailIdToken } from '../config/firebase-admin.js';
import { signAccessToken } from './jwt.service.js';
import {
  createSupabaseUser,
  updateSupabasePassword,
  signInWithSupabase,
  getSupabaseAuthUserById,
  isSupabaseEmailConfirmed,
} from './supabase-sync.service.js';
import * as userRepo from '../repositories/user.repository.js';
import { assertEmailNotSuspended, isEmailSuspended } from './user-suspension.service.js';
import { isValidE164, normalizePhone } from '../utils/phone.js';

const SALT_ROUNDS = 12;

function assertFirebaseReady() {
  if (!isFirebaseConfigured()) {
    throw new AppError(
      'Firebase email verification is not configured. Set Firebase Admin credentials in server/.env and enable Email/Password in Firebase Console.',
      503
    );
  }
}

/**
 * Create or sync auth_users after Firebase email verification, then issue API JWT.
 */
export async function establishAccount({ idToken, password, fullName, phone }) {
  assertFirebaseReady();

  if (!password || password.length < 8) {
    throw new AppError('Password must be at least 8 characters.', 400);
  }

  const { email, displayName } = await verifyFirebaseEmailIdToken(idToken, { requireVerified: true });
  await assertEmailNotSuspended(email);

  const resolvedFullName =
    fullName?.trim() || displayName || email.split('@')[0] || 'User';

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  let user = await userRepo.findByEmail(email);
  let created = false;

  if (user?.isSuspended) {
    throw new AppError('Your account has been suspended. Contact support.', 403);
  }

  if (user) {
    let passwordMatch = false;
    if (user.passwordHash) {
      passwordMatch = await bcrypt.compare(password, user.passwordHash);
    }

    if (!passwordMatch) {
      const { user: sbUser, error } = await signInWithSupabase(email, password);
      if (sbUser) {
        user = await userRepo.updateUser(user.id, {
          passwordHash,
          isVerified: true,
          supabaseUserId: user.supabaseUserId || sbUser.id,
        });
      } else {
        // Email verified in Firebase — sync API password to the Firebase account password.
        user = await userRepo.updateUser(user.id, {
          passwordHash,
          isVerified: true,
          fullName: user.fullName || resolvedFullName,
        });
      }
    } else if (!user.isVerified) {
      user = await userRepo.updateUser(user.id, { isVerified: true });
    }
  } else {
    if (resolvedFullName.length < 2) {
      throw new AppError('Full name is required to complete registration.', 400);
    }

    const normalizedPhone = phone?.trim() ? normalizePhone(phone.trim()) : '';
    if (!normalizedPhone || !isValidE164(normalizedPhone)) {
      throw new AppError(
        'Your mobile number is missing from registration. On Sign Up, enter the same email and phone number, ' +
          'verify your email, then Sign In. Use the same browser if possible, or sign up again after deleting the Firebase user.',
        400
      );
    }

    created = true;
    try {
      user = await userRepo.createUser({
        email,
        passwordHash,
        fullName: resolvedFullName,
        phone: normalizedPhone,
        isVerified: true,
      });
    } catch (err) {
      // Row may exist in auth_users but not yet in profiles (admin list) — complete sign-in instead.
      if (err.statusCode === 409) {
        user = await userRepo.findByEmail(email);
        if (!user) throw err;
        created = false;
        user = await userRepo.updateUser(user.id, {
          passwordHash,
          isVerified: true,
          fullName: user.fullName || resolvedFullName,
          phone: user.phone || normalizedPhone,
        });
      } else {
        throw err;
      }
    }

    const supabaseUserId = await createSupabaseUser({
      email,
      password,
      fullName: user.fullName,
      phone: user.phone,
      emailConfirm: true,
    });

    if (supabaseUserId) {
      user = await userRepo.updateUser(user.id, { supabaseUserId });
    }
  }

  if (!user.supabaseUserId) {
    const supabaseUserId = await createSupabaseUser({
      email,
      password,
      fullName: user.fullName,
      phone: user.phone,
      emailConfirm: true,
    });
    if (supabaseUserId) {
      user = await userRepo.updateUser(user.id, { supabaseUserId });
    }
  } else if (user.supabaseUserId) {
    const sbUser = await getSupabaseAuthUserById(user.supabaseUserId);
    if (sbUser && !isSupabaseEmailConfirmed(sbUser)) {
      await updateSupabasePassword(user.supabaseUserId, password);
    }
  }

  const token = signAccessToken(user);
  return {
    message: created
      ? 'Email verified. Your account is now active.'
      : 'Sign in successful.',
    token,
    user: userRepo.toPublicJSON(user),
  };
}

/** Sync API + Supabase password after Firebase password reset email. */
export async function syncPasswordFromFirebase({ idToken, newPassword }) {
  assertFirebaseReady();

  if (!newPassword || newPassword.length < 8) {
    throw new AppError('Password must be at least 8 characters.', 400);
  }

  const { email } = await verifyFirebaseEmailIdToken(idToken, { requireVerified: false });
  const user = await userRepo.findByEmail(email);

  if (!user) {
    return {
      message: 'Password updated in Firebase. Sign up or sign in to finish setting up your TrustCom account.',
    };
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await userRepo.updateUser(user.id, {
    passwordHash,
    resetPasswordToken: null,
    resetPasswordTokenExpires: null,
  });

  if (user.supabaseUserId) {
    await updateSupabasePassword(user.supabaseUserId, newPassword);
  }

  return { message: 'Password updated successfully. You can now sign in with your new password.' };
}

/** Generic response when Firebase reset is sent (no user enumeration). */
export async function noteFirebasePasswordResetSent(email) {
  const normalized = email.trim().toLowerCase();
  if (await isEmailSuspended(normalized)) {
    throw new AppError('Your account has been suspended. Contact support.', 403);
  }
  return {
    message: 'If an account exists for this email, a password reset link has been sent.',
  };
}
