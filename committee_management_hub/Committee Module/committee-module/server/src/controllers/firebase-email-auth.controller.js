import { asyncHandler } from '../utils/asyncHandler.js';
import * as firebaseEmailAuth from '../services/firebase-email-auth.service.js';

export const establish = asyncHandler(async (req, res) => {
  const { idToken, password, fullName, phone } = req.body;
  const result = await firebaseEmailAuth.establishAccount({
    idToken,
    password,
    fullName,
    phone,
  });
  res.json({ success: true, ...result });
});

export const syncPassword = asyncHandler(async (req, res) => {
  const { idToken, newPassword } = req.body;
  const result = await firebaseEmailAuth.syncPasswordFromFirebase({
    idToken,
    newPassword,
  });
  res.json({ success: true, ...result });
});
