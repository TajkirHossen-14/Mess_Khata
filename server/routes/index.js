import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import expenseRoutes from './expenseRoutes.js';

const router = Router();

// Temporary authentication check route; remove after auth integration.
router.get('/test-protected', protect, (req, res) => {
  res.json({ success: true, data: req.user });
});

// Future feature routers: auth, mess, residents, managers, expenses, billing, payments, notices, complaints, duties.
router.use('/expenses', expenseRoutes);

export default router;