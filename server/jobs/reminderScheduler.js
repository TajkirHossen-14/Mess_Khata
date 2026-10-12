import cron from 'node-cron';
import DutyAssignment from '../models/DutyAssignment.js';
import Resident from '../models/Resident.js';
import { createNotification } from '../services/notificationService.js';
import { runMealCutoffReminders } from './mealCutoffReminder.js';
import { addDays, todayDhaka } from '../utils/dateTime.js';

export const startReminderJobs = () => {
  // Run daily at 9 AM Dhaka time (UTC+6, no DST).
  cron.schedule('0 9 * * *', async () => {
    console.log('Running daily reminder jobs...');
    try {
      // 1. Duty Reminders (tomorrow, in Dhaka calendar terms)
      const tomorrow = addDays(todayDhaka(), 1);
      const startOfTomorrow = new Date(`${tomorrow}T00:00:00.000Z`);
      const endOfTomorrow = new Date(`${tomorrow}T23:59:59.999Z`);

      const duties = await DutyAssignment.find({
        date: { $gte: startOfTomorrow, $lte: endOfTomorrow },
        status: 'assigned'
      }).populate('residentId');

      for (const duty of duties) {
        if (duty.residentId && duty.residentId.userId) {
          const formattedDate = new Date(duty.date).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            timeZone: 'UTC',
          });
          await createNotification({
            recipientId: duty.residentId.userId,
            type: 'duty_reminder',
            title: 'Duty Reminder',
            content: `You have a ${duty.type.replace('_', ' ')} duty scheduled for tomorrow (${formattedDate}).`
          });
        }
      }

      // FUTURE EXTENSION POINT:
      // Add meal-declaration cutoff reminders here (see jobs/mealCutoffReminder.js)
      // Add bill due date reminders here
      // Add payment confirmed/rejected reminders here

    } catch (error) {
      console.error('Error running daily reminder jobs:', error);
    }
  }, { timezone: 'Asia/Dhaka' });

  // Every 15 minutes: meal-declaration cutoff reminders (within 60 minutes of a cutoff).
  cron.schedule('*/15 * * * *', () => {
    runMealCutoffReminders();
  }, { timezone: 'Asia/Dhaka' });

  console.log('Reminder jobs scheduled.');
};
