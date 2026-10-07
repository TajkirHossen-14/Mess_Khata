import { Router } from 'express';
import { submitComplaint } from '../controllers/complaintController.js';
import { protect } from '../middleware/auth.js';
import messScope from '../middleware/messScope.js';
import requireRole from '../middleware/requireRole.js';

const router = Router();
router.post('/', protect, requireRole('resident'), messScope, submitComplaint);

export default router;
