import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import messScope from '../middleware/messScope.js';
import requireRole from '../middleware/requireRole.js';
import {
  generateMealRecords,
  listMealRecords,
} from '../controllers/mealRecordController.js';

const router = Router();

router.get('/', protect, messScope, listMealRecords);
router.post('/generate', protect, requireRole('manager'), messScope, generateMealRecords);

export default router;
