import cron from 'node-cron';
import DutyAssignment from '../models/DutyAssignment.js';
import Resident from '../models/Resident.js';
import { createNotification } from '../services/notificationService.js';

export const startReminderJobs = () => {
  // Run daily at 9 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('Running daily reminder jobs...');
    try {
      // 1. Duty Reminders
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const startOfTomorrow = new Date(tomorrow.setUTCHours(0,0,0,0));
      const endOfTomorrow = new Date(tomorrow.setUTCHours(23,59,59,999));

      const duties = await DutyAssignment.find({
        date: { $gte: startOfTomorrow, $lte: endOfTomorrow },
        status: 'assigned'
      }).populate('residentId');

      for (const duty of duties) {
        if (duty.residentId && duty.residentId.userId) {
          const formattedDate = new Date(duty.date).toLocaleDateString();
          await createNotification({
            recipientId: duty.residentId.userId,
            type: 'duty_reminder',
            title: 'Duty Reminder',
            content: `You have a ${duty.type.replace('_', ' ')} duty scheduled for tomorrow (${formattedDate}).`
          });
        }
      }

      // FUTURE EXTENSION POINT:
      // Add meal-declaration cutoff reminders here
      // Add bill due date reminders here
      // Add payment confirmed/rejected reminders here

    } catch (error) {
      console.error('Error running daily reminder jobs:', error);
    }
  });
  
  console.log('Reminder jobs scheduled.');
};
