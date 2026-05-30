import { asyncHandler } from '../utils/asyncHandler.js';
import * as phoneAuth from '../services/phone-auth.service.js';

export const initSignup = asyncHandler(async (req, res) => {
  const { phone, password, fullName, email } = req.body;
  const result = await phoneAuth.initSignup({ phone, password, fullName, email });
  res.status(201).json({ success: true, ...result });
});

export const recordResend = asyncHandler(async (req, res) => {
  const { sessionId } = req.body;
  const result = await phoneAuth.recordOtpResend(sessionId);
  res.json({ success: true, ...result });
});

export const completeSignup = asyncHandler(async (req, res) => {
  const { sessionId, idToken, password } = req.body;
  const result = await phoneAuth.completeSignup({ sessionId, idToken, password });
  res.json({ success: true, ...result });
});

export const loginPhone = asyncHandler(async (req, res) => {
  const { phone, password } = req.body;
  const result = await phoneAuth.loginWithPhone({ phone, password });
  res.json({ success: true, ...result });
});

export const initPasswordReset = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  const result = await phoneAuth.initPasswordReset({ phone });
  res.json({ success: true, ...result });
});

export const verifyPasswordResetOtp = asyncHandler(async (req, res) => {
  const { sessionId, idToken } = req.body;
  const result = await phoneAuth.verifyPasswordResetOtp({ sessionId, idToken });
  res.json({ success: true, ...result });
});

export const completePasswordReset = asyncHandler(async (req, res) => {
  const { sessionId, idToken, newPassword } = req.body;
  const result = await phoneAuth.completePasswordReset({ sessionId, idToken, newPassword });
  res.json({ success: true, ...result });
});
