import admin from 'firebase-admin';
import { env } from './env.js';
import { AppError } from '../utils/AppError.js';

let initialized = false;

export function isFirebaseConfigured() {
  return Boolean(env.firebaseProjectId && env.firebaseClientEmail && env.firebasePrivateKey);
}

export function getFirebaseAuth() {
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in server/.env'
    );
  }

  if (!initialized) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.firebaseProjectId,
        clientEmail: env.firebaseClientEmail,
        privateKey: env.firebasePrivateKey,
      }),
    });
    initialized = true;
  }

  return admin.auth();
}

/** Verify Firebase ID token from Phone Auth; returns phone_number claim. */
export async function verifyFirebaseIdToken(idToken) {
  const decoded = await getFirebaseAuth().verifyIdToken(idToken);
  const phone = decoded.phone_number;
  if (!phone) {
    throw new Error('Firebase token does not include a verified phone number.');
  }
  return { uid: decoded.uid, phone: normalizePhoneImport(phone) };
}

/** Verify Firebase ID token for email/password auth; email must be verified in Firebase. */
export async function verifyFirebaseEmailIdToken(idToken, { requireVerified = true } = {}) {
  try {
    const auth = getFirebaseAuth();
    const decoded = await auth.verifyIdToken(idToken);
    const userRecord = await auth.getUser(decoded.uid);
    const email = (userRecord.email || decoded.email || '').trim().toLowerCase();
    if (!email) {
      throw new AppError('Firebase token does not include an email address.', 401);
    }

    if (requireVerified && !userRecord.emailVerified) {
      throw new AppError(
        'Please verify your email before signing in. Check your inbox for the verification link.',
        403
      );
    }

    return {
      uid: decoded.uid,
      email,
      displayName: (userRecord.displayName || '').trim(),
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    const code = err?.errorInfo?.code || err?.code || '';
    const detail = err?.errorInfo?.message || err?.message || 'Invalid Firebase sign-in token.';
    console.error('Firebase email token verification failed:', code, detail);
    if (code === 'auth/argument-error' || code === 'auth/id-token-expired') {
      throw new AppError(
        code === 'auth/id-token-expired'
          ? 'Your session expired. Sign in again.'
          : 'Invalid sign-in session. Sign out, refresh, and sign in again.',
        401
      );
    }
    if (String(code).startsWith('auth/')) {
      throw new AppError(detail, 401);
    }
    throw new AppError('Could not verify Firebase sign-in.', 401);
  }
}

function normalizePhoneImport(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits ? `+${digits}` : '';
}
