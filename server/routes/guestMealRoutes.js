import { Router } from 'express';
import { listGuestMeals, removeGuestMeal, saveGuestMeal } from '../controllers/guestMealController.js';
import { protect } from '../middleware/auth.js';
import messScope from '../middleware/messScope.js';
import requireRole from '../middleware/requireRole.js';

const router = Router();

router.use(protect, messScope);

router.post('/', requireRole('resident'), saveGuestMeal);
router.delete('/:id', requireRole('resident'), removeGuestMeal);
router.get('/', listGuestMeals);

export default router;
