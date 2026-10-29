import { Router } from 'express';
import { confirmPayment, rejectPayment, submitPayment } from '../controllers/paymentController.js';
import { protect } from '../middleware/auth.js';
import messScope from '../middleware/messScope.js';
import requireRole from '../middleware/requireRole.js';

const router = Router();

router.post('/', protect, requireRole('resident'), messScope, submitPayment);
router.patch('/:id/confirm', protect, requireRole('manager'), messScope, confirmPayment);
router.patch('/:id/reject', protect, requireRole('manager'), messScope, rejectPayment);

export default router;
