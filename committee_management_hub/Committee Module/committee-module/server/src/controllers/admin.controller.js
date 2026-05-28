import { asyncHandler } from '../utils/asyncHandler.js';
import * as suspensionService from '../services/user-suspension.service.js';

export const suspendUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const result = await suspensionService.suspendUserById(userId);
  res.json({ success: true, ...result });
});

export const reinstateUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const result = await suspensionService.reinstateUserById(userId);
  res.json({ success: true, ...result });
});
