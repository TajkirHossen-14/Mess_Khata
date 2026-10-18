import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import requireRoleMiddleware from '../middleware/requireRole.js';
import messScope from '../middleware/messScope.js';
import { getResidents, getMyMembership, updateMembership } from '../controllers/residentController.js';

const router = Router();

// GET /me must be defined BEFORE /:id to avoid route-matching conflicts
router.get('/me', protect, messScope, getMyMembership);
router.get('/', protect, requireRoleMiddleware('manager'), messScope, getResidents);
router.patch('/:id/membership', protect, requireRoleMiddleware('manager'), messScope, updateMembership);

export default router;