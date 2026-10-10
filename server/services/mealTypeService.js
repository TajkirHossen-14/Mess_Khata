import MealType from '../models/MealType.js';
import { getCutoffClock } from '../utils/dateTime.js';

/**
 * Default meal types seeded for a brand-new mess.
 */
const DEFAULT_MEAL_TYPES = [
  { name: 'Breakfast', time: '08:00', deadlineHoursBefore: 10 },
  { name: 'Lunch', time: '13:00', deadlineHoursBefore: 4 },
  { name: 'Dinner', time: '20:00', deadlineHoursBefore: 4 },
];

/**
 * Only if the mess has ZERO meal types, insert the three defaults.
 * Safe under concurrent calls: relies on the unique compound index
 * and ignores duplicate-key errors.
 */
export async function ensureDefaultMealTypes(messId) {
  const count = await MealType.countDocuments({ messId });
  if (count > 0) return;

  for (const mt of DEFAULT_MEAL_TYPES) {
    try {
      await MealType.create({ messId, ...mt });
    } catch (err) {
      // Ignore duplicate-key errors (code 11000) from concurrent calls
      if (err.code !== 11000) throw err;
    }
  }
}

/**
 * Build a DTO from a MealType document: adds a `cutoff` field with
 * the clock time and day-offset of the declaration cutoff.
 */
export function toMealTypeDTO(doc) {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  obj.cutoff = getCutoffClock(obj.time, obj.deadlineHoursBefore);
  return obj;
}
