import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/error.middleware.js';

const router = Router();

router.post(
  '/register',
  validateBody(['email', 'password', 'fullName']),
  authController.register
);

router.get('/verify-email/:token', authController.verifyEmail);

router.post(
  '/login',
  validateBody(['email', 'password']),
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

export default router;
