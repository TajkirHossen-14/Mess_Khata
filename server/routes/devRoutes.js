import express from 'express';
import { runMealCutoffReminders } from '../jobs/mealCutoffReminder.js';
import { protect } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

// TEMPORARY dev-only trigger (easily removable): lets a Manager simulate a
// run of the meal-cutoff reminder job without waiting for the cron tick.
const router = express.Router();

router.post('/run-meal-reminders', protect, requireRole('manager'), async (req, res, next) => {
  try {
    const now = req.body?.now ? new Date(req.body.now) : new Date();
    if (Number.isNaN(now.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid "now" timestamp' });
    }

    const summary = await runMealCutoffReminders(now);
    res.json({ success: true, data: { ...summary, simulatedFor: now.toISOString() } });
  } catch (error) {
    next(error);
  }
});

export default router;
