import MealDeclaration from '../models/MealDeclaration.js';
import MealType from '../models/MealType.js';
import {
  getCutoffAt,
  toCalendarDate,
  calendarDateString,
  toDhakaDateString,
} from '../utils/dateTime.js';
import { isResidentActiveOn } from './membershipService.js';

/**
 * Returns true if the declaration window for a meal on a given date is still open.
 * Cutoff is meal time minus deadlineHoursBefore hours.
 */
export const isWindowOpen = (mealType, dateStr, now = new Date()) => {
  if (!mealType || !mealType.time) return false;
  const cutoffAt = getCutoffAt(dateStr, mealType);
  const currentTime = new Date(now).getTime();
  return currentTime < cutoffAt.getTime();
};

/**
 * Returns the exact cutoff instant for a meal on dateStr.
 */
export const getCutoff = (mealType, dateStr) => {
  return getCutoffAt(dateStr, mealType);
};

/**
 * Retrieves the meal window state for a resident on dateStr.
 * Includes active meal types, declaration status, and cutoff details.
 */
export const getResidentMealWindow = async (resident, dateStr, now = new Date()) => {
  if (!resident) {
    const err = new Error('Resident is required');
    err.statusCode = 400;
    throw err;
  }

  const isMember = isResidentActiveOn(resident, dateStr);
  const calendarDate = toCalendarDate(dateStr);

  const mealTypes = await MealType.find({
    messId: resident.messId,
    isActive: true,
  }).sort({ time: 1 });

  const declarations = await MealDeclaration.find({
    residentId: resident._id,
    date: calendarDate,
  });

  const declarationMap = new Map();
  declarations.forEach((d) => {
    declarationMap.set(d.mealTypeId.toString(), d.count);
  });

  const slots = mealTypes.map((mt) => {
    const cutoffAt = getCutoffAt(dateStr, mt);
    const isOpen = isMember && isWindowOpen(mt, dateStr, now);
    const existingCount = declarationMap.get(mt._id.toString());
    const count = existingCount !== undefined ? existingCount : 1;

    return {
      mealTypeId: mt._id,
      name: mt.name,
      time: mt.time,
      deadlineHoursBefore: mt.deadlineHoursBefore,
      cutoffAt: cutoffAt.toISOString(),
      isOpen,
      isMember,
      count,
    };
  });

  return {
    date: dateStr,
    isMember,
    slots,
  };
};

/**
 * Declares a meal count for a resident.
 * Enforces membership validity and deadline cutoff rules.
 */
export const declareMeal = async ({
  resident,
  mealTypeId,
  dateStr,
  count = 1,
  now = new Date(),
}) => {
  if (!resident) {
    const err = new Error('Resident is required');
    err.statusCode = 400;
    throw err;
  }

  const calendarDate = toCalendarDate(dateStr);

  if (!isResidentActiveOn(resident, dateStr)) {
    const err = new Error('Resident is not an active member on this date');
    err.statusCode = 400;
    throw err;
  }

  const mealType = await MealType.findOne({
    _id: mealTypeId,
    messId: resident.messId,
    isActive: true,
  });

  if (!mealType) {
    const err = new Error('Meal type not found or inactive');
    err.statusCode = 404;
    throw err;
  }

  if (!isWindowOpen(mealType, dateStr, now)) {
    const err = new Error('Meal declaration deadline has passed for this meal');
    err.statusCode = 400;
    throw err;
  }

  const normalizedCount = Number(count);
  if (isNaN(normalizedCount) || normalizedCount < 0) {
    const err = new Error('Meal count must be a non-negative number');
    err.statusCode = 400;
    throw err;
  }

  const declaration = await MealDeclaration.findOneAndUpdate(
    {
      messId: resident.messId,
      residentId: resident._id,
      mealTypeId: mealType._id,
      date: calendarDate,
    },
    { count: normalizedCount },
    { upsert: true, new: true, runValidators: true }
  );

  return declaration;
};

export default {
  isWindowOpen,
  getCutoff,
  getResidentMealWindow,
  declareMeal,
};
