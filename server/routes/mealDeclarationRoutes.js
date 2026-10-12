import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import requireRoleMiddleware from '../middleware/requireRole.js';
import messScope from '../middleware/messScope.js';
import {
  getMealDeclarations,
  declareMeal,
  getDailySummary,
} from '../controllers/mealDeclarationController.js';

const router = Router();

router.get('/', protect, messScope, getMealDeclarations);
router.post('/declare', protect, requireRoleMiddleware('resident'), messScope, declareMeal);
router.get('/summary', protect, messScope, getDailySummary);

export default router;
