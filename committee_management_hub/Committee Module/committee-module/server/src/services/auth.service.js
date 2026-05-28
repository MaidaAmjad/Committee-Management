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
  findSupabaseUserByEmail,
  getProfileById,
  isSupabaseEmailConfirmed,
} from './supabase-sync.service.js';
import * as userRepo from '../repositories/user.repository.js';
import { assertEmailNotSuspended, isEmailSuspended } from './user-suspension.service.js';

const SALT_ROUNDS = 12;

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function buildVerificationUrl(rawVerificationToken) {
  return `${env.apiUrl}/api/auth/verify-email/${rawVerificationToken}`;
}

async function sendVerificationOrFail(user, rawVerificationToken) {
  const verifyUrl = buildVerificationUrl(rawVerificationToken);

  try {
    await sendVerificationEmail(user, rawVerificationToken);
    return { verifyUrl: null, devEmailBypass: false };
  } catch (err) {
    console.error('Verification email failed:', err.message);

    if (env.emailDevBypass) {
      console.log('\n=== DEV: Verification link (email not sent) ===');
      console.log(verifyUrl);
      console.log('===============================================\n');
      return {
        verifyUrl,
        devEmailBypass: true,
        message:
          'Brevo could not send email (SMTP not active). Copy the verification link from the API terminal (npm run dev), open it in your browser, then sign in.',
      };
    }

    if (err instanceof AppError) {
      throw err;
    }

    throw new AppError(
      'Could not send verification email. Check spam, or try again in a few minutes.',
      502
    );
  }
}

/** Re-send verification for an unverified auth_users row (e.g. prior signup email failed). */
async function completeUnverifiedRegistration(user, { password, fullName, phone }) {
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const rawVerificationToken = generateSecureToken();

  let updated = await userRepo.updateUser(user.id, {
    passwordHash: hashedPassword,
    fullName: fullName.trim(),
    phone: phone?.trim() || null,
    verificationToken: hashToken(rawVerificationToken),
    verificationTokenExpires: addHours(new Date(), env.emailVerificationExpiresHours),
  });

  let supabaseUserId = updated.supabaseUserId;
  if (!supabaseUserId) {
    const supabaseExisting = await findSupabaseUserByEmail(updated.email);
    if (supabaseExisting) {
      supabaseUserId = supabaseExisting.id;
      await updateSupabasePassword(supabaseUserId, password);
    } else {
      supabaseUserId = await createSupabaseUser({
        email: updated.email,
        password,
        fullName: updated.fullName,
        phone: updated.phone,
      });
    }
    if (supabaseUserId) {
      updated = await userRepo.updateUser(user.id, { supabaseUserId });
    }
  } else {
    await updateSupabasePassword(supabaseUserId, password);
  }

  const emailResult = await sendVerificationOrFail(updated, rawVerificationToken);

  return {
    message:
      emailResult.message ||
      'Verification email sent. Please check your inbox and spam folder, then click the link to activate your account.',
    user: userRepo.toPublicJSON(updated),
    verificationResent: true,
    devEmailBypass: emailResult.devEmailBypass,
    devVerifyUrl: emailResult.verifyUrl,
  };
}

export async function registerUser({ email, password, fullName, phone }) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!password || password.length < 8) {
    throw new AppError('Password must be at least 8 characters.', 400);
  }

  await assertEmailNotSuspended(normalizedEmail);

  const existing = await userRepo.findByEmail(normalizedEmail);
  if (existing) {
    if (existing.isSuspended) {
      throw new AppError(
        'This email is associated with a suspended account. Contact support if you believe this is a mistake.',
        403
      );
    }
    if (existing.isVerified) {
      throw new AppError('An account with this email already exists. Please sign in.', 409);
    }
    return completeUnverifiedRegistration(existing, { password, fullName, phone });
  }

  const supabaseExisting = await findSupabaseUserByEmail(normalizedEmail);
  if (supabaseExisting && isSupabaseEmailConfirmed(supabaseExisting)) {
    throw new AppError('An account with this email already exists. Please sign in.', 409);
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const rawVerificationToken = generateSecureToken();

  if (supabaseExisting) {
    let user = await userRepo.createUser({
      email: normalizedEmail,
      passwordHash: hashedPassword,
      fullName: fullName.trim(),
      phone: phone?.trim() || null,
      verificationToken: hashToken(rawVerificationToken),
      verificationTokenExpires: addHours(new Date(), env.emailVerificationExpiresHours),
      supabaseUserId: supabaseExisting.id,
    });

    await updateSupabasePassword(supabaseExisting.id, password);
    const emailResult = await sendVerificationOrFail(user, rawVerificationToken);

    return {
      message:
        emailResult.message ||
        'Verification email sent. Please check your inbox and spam folder, then click the link to activate your account.',
      user: userRepo.toPublicJSON(user),
      verificationResent: true,
      devEmailBypass: emailResult.devEmailBypass,
      devVerifyUrl: emailResult.verifyUrl,
    };
  }

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

  const emailResult = await sendVerificationOrFail(user, rawVerificationToken);

  return {
    message:
      emailResult.message ||
      'Registration successful. Please check your email to verify your account.',
    user: userRepo.toPublicJSON(user),
    verificationResent: false,
    devEmailBypass: emailResult.devEmailBypass,
    devVerifyUrl: emailResult.verifyUrl,
  };
}

export async function resendVerificationEmail(email) {
  const normalizedEmail = email.trim().toLowerCase();
  await assertEmailNotSuspended(normalizedEmail);
  const user = await userRepo.findByEmail(normalizedEmail);

  if (!user) {
    return {
      message: 'If an account exists for this email, a verification link has been sent.',
    };
  }

  if (user.isVerified) {
    throw new AppError('This email is already verified. Please sign in.', 400);
  }

  const rawVerificationToken = generateSecureToken();
  const updated = await userRepo.updateUser(user.id, {
    verificationToken: hashToken(rawVerificationToken),
    verificationTokenExpires: addHours(new Date(), env.emailVerificationExpiresHours),
  });

  const emailResult = await sendVerificationOrFail(updated, rawVerificationToken);

  return {
    message:
      emailResult.message ||
      'Verification email sent. Please check your inbox and spam folder.',
    verificationResent: true,
    devEmailBypass: emailResult.devEmailBypass,
    devVerifyUrl: emailResult.verifyUrl,
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

  if (await isEmailSuspended(normalizedEmail)) {
    throw new AppError(
      'Your account has been suspended. Contact support if you believe this is a mistake.',
      403
    );
  }

  let user = await userRepo.findByEmail(normalizedEmail);

  if (user?.isSuspended) {
    throw new AppError(
      'Your account has been suspended. Contact support if you believe this is a mistake.',
      403
    );
  }

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
