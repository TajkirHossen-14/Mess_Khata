/**
 * Shared date/time utilities for Bangladesh time (Asia/Dhaka, UTC+6).
 * Pure functions — no database access.
 */

export const DHAKA_UTC_OFFSET = '+06:00';

/**
 * Validate a 'YYYY-MM-DD' string as a real calendar date and return
 * a Date object set to UTC midnight of that date.
 * Throws a 400-style error for invalid or non-existent dates (e.g. Feb 30).
 */
export function toCalendarDate(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const error = new Error(`Invalid date format: "${str}" — expected YYYY-MM-DD`);
    error.statusCode = 400;
    throw error;
  }

  const [y, m, d] = str.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));

  // Verify the date components round-trip (catches Feb 30, Apr 31, etc.)
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    const error = new Error(`Invalid date: "${str}" does not exist`);
    error.statusCode = 400;
    throw error;
  }

  return date;
}

/**
 * Inverse of toCalendarDate: Date -> 'YYYY-MM-DD' using its UTC date parts.
 */
export function calendarDateString(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Given any Date or timestamp, return the 'YYYY-MM-DD' calendar date in
 * Dhaka time (shift +6 hours, then take the date part).
 */
export function toDhakaDateString(dateOrTimestamp) {
  const date = dateOrTimestamp instanceof Date ? dateOrTimestamp : new Date(dateOrTimestamp);
  // Add 6 hours to UTC to get Dhaka local time, then extract the date
  const dhakaMs = date.getTime() + 6 * 60 * 60 * 1000;
  const dhaka = new Date(dhakaMs);
  return calendarDateString(dhaka);
}

/**
 * Today's date in Dhaka as 'YYYY-MM-DD'.
 */
export function todayDhaka(now = new Date()) {
  return toDhakaDateString(now);
}

/**
 * Add n days to a 'YYYY-MM-DD' string. Returns 'YYYY-MM-DD'.
 */
export function addDays(dateStr, n) {
  const date = toCalendarDate(dateStr);
  date.setUTCDate(date.getUTCDate() + n);
  return calendarDateString(date);
}

/**
 * The instant of a meal at `timeStr` ('HH:mm') on `dateStr` ('YYYY-MM-DD')
 * in Dhaka time. Returns a Date.
 */
export function getMealDateTime(dateStr, timeStr) {
  // Validate inputs
  toCalendarDate(dateStr); // ensures dateStr is valid
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(timeStr)) {
    const error = new Error(`Invalid time format: "${timeStr}" — expected HH:mm`);
    error.statusCode = 400;
    throw error;
  }
  return new Date(`${dateStr}T${timeStr}:00${DHAKA_UTC_OFFSET}`);
}

/**
 * The declaration cutoff instant for a given meal on a given date.
 * cutoff = meal datetime minus mealType.deadlineHoursBefore hours.
 */
export function getCutoffAt(dateStr, mealType) {
  const mealDt = getMealDateTime(dateStr, mealType.time);
  return new Date(mealDt.getTime() - mealType.deadlineHoursBefore * 60 * 60 * 1000);
}

/**
 * Compute the cutoff clock time and how many days before the meal date it falls.
 * Returns { time: 'HH:mm', dayOffset: 0 | -1 | -2 }.
 *
 * Example: meal at 08:00 with 10h deadline -> cutoff 22:00 the day before
 *          -> { time: '22:00', dayOffset: -1 }
 */
export function getCutoffClock(timeStr, hoursBefore) {
  // Use a reference date far from month boundaries
  const refDate = '2020-06-15';
  const mealDt = getMealDateTime(refDate, timeStr);
  const cutoff = new Date(mealDt.getTime() - hoursBefore * 60 * 60 * 1000);

  // Extract Dhaka-local time from the cutoff
  const dhakaMs = cutoff.getTime() + 6 * 60 * 60 * 1000;
  const dhaka = new Date(dhakaMs);
  const hh = String(dhaka.getUTCHours()).padStart(2, '0');
  const mm = String(dhaka.getUTCMinutes()).padStart(2, '0');

  // dayOffset = cutoff date in Dhaka minus meal date in Dhaka
  const cutoffDate = toDhakaDateString(cutoff);
  const mealDate = toDhakaDateString(mealDt);
  const cutoffDay = toCalendarDate(cutoffDate);
  const mealDay = toCalendarDate(mealDate);
  const dayOffset = Math.round((cutoffDay.getTime() - mealDay.getTime()) / (24 * 60 * 60 * 1000));

  return { time: `${hh}:${mm}`, dayOffset };
}

