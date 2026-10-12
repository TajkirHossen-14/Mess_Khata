import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import messScope from '../middleware/messScope.js';
import requireRole from '../middleware/requireRole.js';
import {
  applyToBillingPeriod,
  createRecurringCost,
  getRecurringCosts,
  updateRecurringCost,
} from '../controllers/recurringCostController.js';

const router = Router();

router.post(
  '/apply',
  protect,
  requireRole('manager'),
  messScope,
  applyToBillingPeriod
);
router.post(
  '/',
  protect,
  requireRole('manager'),
  messScope,
  createRecurringCost
);
router.get('/', protect, messScope, getRecurringCosts);
router.patch(
  '/:id',
  protect,
  requireRole('manager'),
  messScope,
  updateRecurringCost
);

export default router;
