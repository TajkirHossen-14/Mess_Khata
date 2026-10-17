import { Router } from 'express';
import {
  submitComplaint,
  getMyComplaints,
  getComplaints,
  getComplaintById,
  updateComplaint,
} from '../controllers/complaintController.js';
import { protect } from '../middleware/auth.js';
import messScope from '../middleware/messScope.js';
import requireRole from '../middleware/requireRole.js';

const router = Router();

router.use(protect, messScope);

router.post('/', requireRole('resident'), submitComplaint);
router.get('/mine', requireRole('resident'), getMyComplaints);

router.get('/', requireRole('manager'), getComplaints);
router.get('/:id', requireRole('manager'), getComplaintById);
router.patch('/:id', requireRole('manager'), updateComplaint);

export default router;
