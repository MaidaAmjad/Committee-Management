import { asyncHandler } from '../utils/asyncHandler.js';
import * as suspensionService from '../services/user-suspension.service.js';
import * as deletionService from '../services/user-deletion.service.js';

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

export const deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const result = await deletionService.deleteUserCompletely(userId);
  res.json({ success: true, ...result });
});
