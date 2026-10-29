import { Router } from 'express';
import { submitPayment } from '../controllers/paymentController.js';
import { protect } from '../middleware/auth.js';
import messScope from '../middleware/messScope.js';
import requireRole from '../middleware/requireRole.js';

const router = Router();

router.post('/', protect, requireRole('resident'), messScope, submitPayment);

export default router;
