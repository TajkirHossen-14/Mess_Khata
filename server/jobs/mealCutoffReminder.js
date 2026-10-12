import MealType from '../models/MealType.js';
import MealDeclaration from '../models/MealDeclaration.js';
import Resident from '../models/Resident.js';
import { createNotification } from '../services/notificationService.js';
import { isResidentActiveOn } from '../services/membershipService.js';
import { addDays, getCutoffAt, todayDhaka, toCalendarDate } from '../utils/dateTime.js';

export const REMINDER_WINDOW_MINUTES = 60;

let isRunning = false;

const formatClock = (date) => {
  // Dhaka clock (UTC+6) as HH:mm
  const dhaka = new Date(date.getTime() + 6 * 60 * 60 * 1000);
  return `${String(dhaka.getUTCHours()).padStart(2, '0')}:${String(dhaka.getUTCMinutes()).padStart(2, '0')}`;
};

const formatDayLabel = (dateStr) => {
  const d = toCalendarDate(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
};

/**
 * Notify every active Resident of the mess who has not yet declared the meal.
 */
async function processMeal(mealType, dateStr) {
  const residents = await Resident.find({ messId: mealType.messId });

  const activeResidents = residents.filter((resident) => isResidentActiveOn(resident, dateStr));
  if (activeResidents.length === 0) return { notified: 0 };

  const date = toCalendarDate(dateStr);

  const alreadyDeclared = await MealDeclaration.find({
    mealTypeId: mealType._id,
    date,
    status: { $in: ['on', 'off'] },
  }).select('residentId');

  const declaredResidentIds = new Set(alreadyDeclared.map((d) => d.residentId.toString()));

  const pending = activeResidents.filter(
    (resident) => !declaredResidentIds.has(resident._id.toString())
  );

  let notified = 0;
  for (const resident of pending) {
    const cutoffAt = getCutoffAt(dateStr, mealType);
    const notification = await createNotification({
      recipientId: resident.userId,
      type: 'meal_deadline',
      title: `${mealType.name} declaration closes soon`,
      content: `${mealType.name} declaration for ${formatDayLabel(dateStr)} closes at ${formatClock(cutoffAt)} - you haven't declared yet.`,
      dedupeKey: `meal_deadline:${mealType._id}:${dateStr}`,
    });
    if (notification) notified += 1;
  }

  return { notified };
}

/**
 * Send meal-declaration cutoff reminders (about one hour before each cutoff).
 * Never throws: a failure is logged and the summary is still returned.
 */
export async function runMealCutoffReminders(now = new Date()) {
  if (isRunning) {
    console.log('Meal cutoff reminder run skipped: previous run is still in progress.');
    return { checked: 0, notified: 0 };
  }

  isRunning = true;

  try {
    let checked = 0;
    let notified = 0;

    const mealTypes = await MealType.find({ isActive: true });
    if (mealTypes.length === 0) return { checked: 0, notified: 0 };

    const windowMs = REMINDER_WINDOW_MINUTES * 60 * 1000;
    const candidateDates = [0, 1, 2].map((offset) => addDays(todayDhaka(now), offset));

    for (const dateStr of candidateDates) {
      for (const mealType of mealTypes) {
        const cutoffAt = getCutoffAt(dateStr, mealType);
        const remaining = cutoffAt.getTime() - now.getTime();

        // Only process cutoffs that fall inside the reminder window.
        if (remaining <= 0 || remaining > windowMs) continue;

        checked += 1;
        const result = await processMeal(mealType, dateStr);
        notified += result.notified;
      }
    }

    return { checked, notified };
  } catch (error) {
    console.error('Error running meal cutoff reminders:', error);
    return { checked: 0, notified: 0 };
  } finally {
    isRunning = false;
  }
}
