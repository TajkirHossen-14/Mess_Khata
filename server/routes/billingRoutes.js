import express from 'express'; import { protect } from '../middleware/auth.js'; import { messScope } from '../middleware/messScope.js'; import { mealRate, billingSummary } from '../controllers/billingController.js';
const router = express.Router(); router.use(protect, messScope); router.get('/meal-rate', mealRate); router.get('/summary', billingSummary); export default router;
