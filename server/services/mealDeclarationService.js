import MealType from '../models/MealType.js';
import MealDeclaration from '../models/MealDeclaration.js';
import { getResidentByUser, isResidentActiveOn } from './membershipService.js';
import { toCalendarDate, getCutoffAt } from '../utils/dateTime.js';

// Shared "one resident's meals for a single day" view. Used by the declaration
// controller (GET /api/meal-declarations/day) and the resident dashboard so the
// logic lives in exactly one place.
export async function getResidentDayView({ messId, userId, dateStr, now = new Date() }) {
  const resident = await getResidentByUser(userId, messId);
  const meals = await MealType.find({ messId, isActive: true }).sort({ time: 1 });
  const declarations = resident
    ? await MealDeclaration.find({ residentId: resident._id, date: toCalendarDate(dateStr), mealTypeId: { $in: meals.map((m) => m._id) } }).lean()
    : [];
  const byType = new Map(declarations.map((d) => [d.mealTypeId.toString(), d.status]));
  return {
    date: dateStr,
    membershipActive: Boolean(resident && isResidentActiveOn(resident, dateStr)),
    meals: meals.map((m) => {
      const cutoffAt = getCutoffAt(dateStr, m);
      return { mealTypeId: m._id, name: m.name, time: m.time, cutoffAt: cutoffAt.toISOString(), isLocked: now >= cutoffAt, status: byType.get(m._id.toString()) || null };
    }),
  };
}
