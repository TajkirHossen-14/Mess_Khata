import { Router } from 'express';
import { assignDuty, getAllDuties, getMessResidents, getMyDuties, updateDutyStatus } from '../controllers/dutyController.js';
import { protect } from '../middleware/auth.js';
import messScope from '../middleware/messScope.js';
import requireRole from '../middleware/requireRole.js';

const router = Router();
router.get('/my', protect, requireRole('resident'), messScope, getMyDuties);
router.get('/residents', protect, requireRole('manager'), messScope, getMessResidents);
router.post('/', protect, requireRole('manager'), messScope, assignDuty);
router.get('/', protect, requireRole('manager'), messScope, getAllDuties);
router.patch('/:id', protect, requireRole('manager'), messScope, updateDutyStatus);

export default router;
