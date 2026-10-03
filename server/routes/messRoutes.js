import express from 'express';
import { createMess, joinMess } from '../controllers/messController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/create', protect, createMess);
router.post('/join', protect, joinMess);

export default router;
