import { Router } from 'express';
import { requireAdmin } from '../middleware/admin.middleware.js';
import * as adminController from '../controllers/admin.controller.js';

const router = Router();

router.use(requireAdmin);

router.post('/users/:userId/suspend', adminController.suspendUser);
router.post('/users/:userId/reinstate', adminController.reinstateUser);
router.post('/users/:userId/delete', adminController.deleteUser);

export default router;
