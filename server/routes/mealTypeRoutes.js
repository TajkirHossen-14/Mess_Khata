import express from 'express';
import { protect } from '../middleware/auth.js';
import { messScope } from '../middleware/messScope.js';
import { requireRole } from '../middleware/requireRole.js';
import {
  getSchedule,
  updateSchedule,
  getMealTypes,
  createMealType,
  updateMealType,
  deleteMealType,
} from '../controllers/mealTypeController.js';

const router = express.Router();

router.use(protect, messScope);

router.get('/schedule', getSchedule);
router.put('/schedule', requireRole('manager'), updateSchedule);

router.get('/', getMealTypes);
router.post('/', requireRole('manager'), createMealType);

router.patch('/:id', requireRole('manager'), updateMealType);
router.delete('/:id', requireRole('manager'), deleteMealType);

export default router;

