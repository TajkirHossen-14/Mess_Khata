import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import messScope from '../middleware/messScope.js';
import requireRole from '../middleware/requireRole.js';
import {
  calculateFixedCostPreview,
  finalizeFixedCostPreview,
  getFixedCostPolicy,
  getFixedCostSplits,
  updateFixedCostPolicy,
} from '../controllers/fixedCostSharingController.js';

const router = Router();

router.get('/policy', protect, messScope, getFixedCostPolicy);
router.put('/policy', protect, requireRole('manager'), messScope, updateFixedCostPolicy);
router.post('/calculate', protect, messScope, calculateFixedCostPreview);
router.post('/finalize', protect, requireRole('manager'), messScope, finalizeFixedCostPreview);
router.get('/splits', protect, messScope, getFixedCostSplits);

export default router;
