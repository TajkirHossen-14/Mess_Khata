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

/**
 * Schedule presets: preset key -> { label, meals }.
 */
export const SCHEDULE_PRESETS = {
  three_meals: {
    label: '3 meals / day',
    meals: [
      { name: 'Breakfast', time: '08:00', deadlineHoursBefore: 10 },
      { name: 'Lunch', time: '13:00', deadlineHoursBefore: 4 },
      { name: 'Dinner', time: '20:00', deadlineHoursBefore: 4 },
    ],
  },
  lunch_dinner: {
    label: 'Lunch + Dinner',
    meals: [
      { name: 'Lunch', time: '13:00', deadlineHoursBefore: 4 },
      { name: 'Dinner', time: '20:00', deadlineHoursBefore: 4 },
    ],
  },
};

/**
 * Derive the current schedule preset from the active meal types.
 * Returns 'three_meals' | 'lunch_dinner' | 'custom'.
 */
export async function getCurrentSchedule(messId) {
  const activeMeals = await MealType.find({ messId, isActive: true }).select('name');
  const activeNames = activeMeals.map((m) => m.name.toLowerCase()).sort();

  for (const [key, preset] of Object.entries(SCHEDULE_PRESETS)) {
    const presetNames = preset.meals.map((m) => m.name.toLowerCase()).sort();
    if (
      activeNames.length === presetNames.length &&
      activeNames.every((n, i) => n === presetNames[i])
    ) {
      return key;
    }
  }

  return 'custom';
}

/**
 * Apply a schedule preset to a mess:
 *   1. Activate (or create) each meal in the preset.
 *   2. Deactivate every other meal type of the mess.
 * Never deletes anything.
 */
export async function applySchedule(messId, presetKey) {
  const preset = SCHEDULE_PRESETS[presetKey];
  if (!preset) {
    const error = new Error(`Unknown schedule preset: "${presetKey}"`);
    error.statusCode = 400;
    throw error;
  }

  const activatedIds = [];

  // Step 1: activate or create each meal in the preset
  for (const meal of preset.meals) {
    // Find existing by name (case-insensitive via collation)
    let mealType = await MealType.findOne({ messId, name: meal.name }).collation({
      locale: 'en',
      strength: 2,
    });

    if (mealType) {
      // Activate it (keep its customized time/deadline)
      mealType.isActive = true;
      await mealType.save();
    } else {
      // Create from preset defaults
      mealType = await MealType.create({ messId, ...meal });
    }

    activatedIds.push(mealType._id);
  }

  // Step 2: deactivate all other meal types of the mess
  await MealType.updateMany(
    { messId, _id: { $nin: activatedIds } },
    { $set: { isActive: false } }
  );
}

