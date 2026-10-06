import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import messScope from '../middleware/messScope.js';
import requireRole from '../middleware/requireRole.js';
import { createExpense, getExpenses } from '../controllers/expenseController.js';

const router = Router();

router.post('/', protect, requireRole('manager'), messScope, createExpense);
router.get('/', protect, messScope, getExpenses);

export default router;
