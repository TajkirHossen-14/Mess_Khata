import DutyAssignment from '../models/DutyAssignment.js';
import Resident from '../models/Resident.js';
import { createNotification } from '../services/notificationService.js';
import { addDays, todayDhaka, isPastDhakaHour } from '../utils/dateTime.js';
import { isResidentActiveOn } from '../services/membershipService.js';

export function shouldRemindForDuty({ assignment, resident, tomorrowStr }) {
  if (!assignment || assignment.status !== 'assigned') return false;
  const dStr = (assignment.date instanceof Date ? assignment.date.toISOString().slice(0, 10) : String(assignment.date).slice(0, 10));
  if (dStr !== tomorrowStr) return false;
  if (!resident) return false;
  return isResidentActiveOn(resident, tomorrowStr);
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDutyReminder(assignment) {
  const type = String(assignment.type).replace(/_/g, ' ');
  const label = type.charAt(0).toUpperCase() + type.slice(1);
  const d = assignment.date instanceof Date ? assignment.date : new Date(assignment.date);
  const dayLabel = `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  return `Tomorrow, ${dayLabel}: ${label} duty`;
}

let isRunning = false;
export async function runDutyReminders(now = new Date(), { ignoreTimeGate = false } = {}) {
  if (isRunning) return { checked: 0, notified: 0 };
  if (!ignoreTimeGate && !isPastDhakaHour(now, 9)) return { checked: 0, notified: 0 };
  isRunning = true;
  try {
    const tomorrow = addDays(todayDhaka(now), 1);
    const duties = await DutyAssignment.find({ status: 'assigned' }).populate('residentId').lean();
    let checked = 0, notified = 0;
    for (const duty of duties) {
      const resident = duty.residentId;
      if (!shouldRemindForDuty({ assignment: duty, resident, tomorrowStr: tomorrow })) continue;
      checked++;
      if (resident?.userId) {
        await createNotification({ recipientId: resident.userId, type: 'duty_reminder', title: 'Duty Reminder', content: formatDutyReminder(duty), dedupeKey: `duty_reminder:${duty._id}` });
        notified++;
      }
    }
    return { checked, notified };
  } finally { isRunning = false; }
}

export default { shouldRemindForDuty, formatDutyReminder, runDutyReminders };
