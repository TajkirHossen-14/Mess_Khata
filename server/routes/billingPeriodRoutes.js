import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import messScope from '../middleware/messScope.js';
import requireRole from '../middleware/requireRole.js';
import {
  createBillingPeriod,
  deleteBillingPeriod,
  getBillingPeriods,
  updateBillingPeriod,
} from '../controllers/billingPeriodController.js';

const router = Router();

router.get('/', protect, messScope, getBillingPeriods);
router.post('/', protect, requireRole('manager'), messScope, createBillingPeriod);
router.patch('/:id', protect, requireRole('manager'), messScope, updateBillingPeriod);
router.delete('/:id', protect, requireRole('manager'), messScope, deleteBillingPeriod);

export default router;
