import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as authService from '../services/auth.service.js';

export const register = asyncHandler(async (req, res) => {
  const { email, password, fullName, phone } = req.body;
  const result = await authService.registerUser({ email, password, fullName, phone });
  res.status(201).json({ success: true, ...result });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const result = await authService.verifyEmail(token);

  const redirectUrl = `${env.clientUrl}/login?verified=1`;
  if (req.query.format === 'json') {
    return res.json({ success: true, ...result });
  }

  res.redirect(redirectUrl);
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.loginUser({ email, password });
  res.json({ success: true, ...result });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await authService.forgotPassword(email);
  res.json({ success: true, ...result });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  const result = await authService.resetPassword({ token, newPassword });
  res.json({ success: true, ...result });
});

export const me = asyncHandler(async (req, res) => {
  const user = await authService.getUserById(req.userId);
  res.json({ success: true, user });
});
