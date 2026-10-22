import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import messScope from '../middleware/messScope.js';
import requireRole from '../middleware/requireRole.js';
import { createAdjustment, listAdjustments, voidAdjustment } from '../controllers/adjustmentController.js';

const router = Router();
router.post('/', protect, requireRole('manager'), messScope, createAdjustment);
router.get('/', protect, requireRole('manager', 'resident'), messScope, listAdjustments);
router.post('/:id/void', protect, requireRole('manager'), messScope, voidAdjustment);
export default router;
