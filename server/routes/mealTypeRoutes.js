import express from 'express';
import { protect } from '../middleware/auth.js';
import { messScope } from '../middleware/messScope.js';
import { requireRole } from '../middleware/requireRole.js';
import {
  getMealTypes,
  createMealType,
  updateMealType,
  deleteMealType,
} from '../controllers/mealTypeController.js';

const router = express.Router();

router.use(protect, messScope);

router.get('/', getMealTypes);
router.post('/', requireRole('manager'), createMealType);

router.patch('/:id', requireRole('manager'), updateMealType);
router.delete('/:id', requireRole('manager'), deleteMealType);

export default router;
