import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import messScope from '../middleware/messScope.js';
import requireRole from '../middleware/requireRole.js';
import { getBilling, getMealRate } from '../controllers/billingController.js';

const router = Router();

router.get('/meal-rate', protect, requireRole('manager', 'resident'), messScope, getMealRate);
router.get('/summary', protect, requireRole('manager', 'resident'), messScope, getBilling);

export default router;
