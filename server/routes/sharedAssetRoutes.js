import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import messScope from '../middleware/messScope.js';
import requireRole from '../middleware/requireRole.js';
import { createSharedAsset, getMessResidents } from '../controllers/sharedAssetController.js';

const router = Router();

router.get('/residents', protect, requireRole('manager'), messScope, getMessResidents);
router.post('/', protect, requireRole('manager'), messScope, createSharedAsset);

export default router;
