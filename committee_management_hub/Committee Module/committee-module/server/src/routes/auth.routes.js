import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import * as phoneAuthController from '../controllers/phone-auth.controller.js';
import * as firebaseEmailAuthController from '../controllers/firebase-email-auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/error.middleware.js';
import { requireCaptcha } from '../middleware/captcha.middleware.js';

const router = Router();

router.post('/captcha/verify', requireCaptcha, authController.captchaVerified);

router.post(
  '/register',
  validateBody(['email', 'password', 'fullName']),
  authController.register
);

router.get('/verify-email/:token', authController.verifyEmail);

router.post(
  '/resend-verification',
  validateBody(['email']),
  authController.resendVerification
);

router.post(
  '/login',
  validateBody(['email', 'password']),
  requireCaptcha,
  authController.login
);

router.post(
  '/forgot-password',
  validateBody(['email']),
  authController.forgotPassword
);

router.post(
  '/reset-password',
  validateBody(['token', 'newPassword']),
  authController.resetPassword
);

router.get('/me', authenticate, authController.me);
router.post('/supabase-session', authenticate, authController.supabaseSession);

router.post(
  '/firebase-email/establish',
  validateBody(['idToken', 'password']),
  requireCaptcha,
  firebaseEmailAuthController.establish
);
router.post(
  '/firebase-email/sync-password',
  validateBody(['idToken', 'newPassword']),
  firebaseEmailAuthController.syncPassword
);

router.post(
  '/phone/signup/init',
  validateBody(['phone', 'password', 'fullName']),
  phoneAuthController.initSignup
);
router.post('/phone/signup/resend', validateBody(['sessionId']), phoneAuthController.recordResend);
router.post(
  '/phone/signup/complete',
  validateBody(['sessionId', 'idToken', 'password']),
  phoneAuthController.completeSignup
);
router.post('/phone/login', validateBody(['phone', 'password']), phoneAuthController.loginPhone);
router.post('/phone/forgot/init', validateBody(['phone']), phoneAuthController.initPasswordReset);
router.post(
  '/phone/forgot/verify',
  validateBody(['sessionId', 'idToken']),
  phoneAuthController.verifyPasswordResetOtp
);
router.post(
  '/phone/forgot/complete',
  validateBody(['sessionId', 'idToken', 'newPassword']),
  phoneAuthController.completePasswordReset
);

export default router;
