import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import expenseRoutes from './expenseRoutes.js';
import recurringCostRoutes from './recurringCostRoutes.js';
import billingPeriodRoutes from './billingPeriodRoutes.js';
import fixedCostSharingRoutes from './fixedCostSharingRoutes.js';
import sharedAssetRoutes from './sharedAssetRoutes.js';

const router = Router();

// Temporary authentication check route; remove after auth integration.
router.get('/test-protected', protect, (req, res) => {
  res.json({ success: true, data: req.user });
});

// Future feature routers: auth, mess, residents, managers, expenses, billing, payments, notices, complaints, duties.
router.use('/expenses', expenseRoutes);
router.use('/recurring-costs', recurringCostRoutes);
router.use('/billing-periods', billingPeriodRoutes);
router.use('/fixed-cost-sharing', fixedCostSharingRoutes);
router.use('/shared-assets', sharedAssetRoutes);

export default router;
