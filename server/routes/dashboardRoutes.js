import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import messScope from '../middleware/messScope.js';
import requireRole from '../middleware/requireRole.js';
import { residentDashboard, managerDashboard } from '../controllers/dashboardController.js';

const router = Router();

// Resident dashboard (Manager-only accounts are rejected by requireRole('resident')).
router.get('/resident', protect, requireRole('resident'), messScope, residentDashboard);

// Manager dashboard (Resident-only accounts are rejected by requireRole('manager')).
router.get('/manager', protect, requireRole('manager'), messScope, managerDashboard);

export default router;
