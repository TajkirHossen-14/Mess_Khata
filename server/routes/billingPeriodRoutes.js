import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import messScope from '../middleware/messScope.js';
import requireRole from '../middleware/requireRole.js';
import { createBillingPeriod } from '../controllers/billingPeriodController.js';

const router = Router();

router.post(
  '/',
  protect,
  requireRole('manager'),
  messScope,
  createBillingPeriod
);

export default router;
