import Resident from '../models/Resident.js';
import { toDhakaDateString, toCalendarDate } from '../utils/dateTime.js';

/**
 * Returns the Resident document for a given userId + messId, or null.
 */
export const getResidentByUser = async (userId, messId) => {
  return Resident.findOne({ userId, messId });
};

/**
 * Returns true if the Resident is active on the given calendar date (YYYY-MM-DD).
 * leavingDate is the LAST day of membership (inclusive).
 */
export const isResidentActiveOn = (resident, dateStr) => {
  if (!resident) return false;
  const joinDate = toDhakaDateString(resident.joiningDate);
  if (dateStr < joinDate) return false;
  if (resident.leavingDate) {
    const leaveDate = toDhakaDateString(resident.leavingDate);
    if (dateStr > leaveDate) return false;
  }
  return true;
};

/**
 * Returns true if the Resident is active on at least one day of the range [startStr, endStr].
 */
export const overlapsPeriod = (resident, startStr, endStr) => {
  if (!resident) return false;
  const joinDate = toDhakaDateString(resident.joiningDate);
  const leaveDate = resident.leavingDate ? toDhakaDateString(resident.leavingDate) : null;

  // Range is [startStr, endStr]; resident active window is [joinDate, leaveDate or Infinity]
  const rangeEnd = endStr;
  const resStart = joinDate;
  const resEnd = leaveDate || '9999-12-31';

  return resStart <= rangeEnd && resEnd >= startStr;
};

/**
 * Returns the intersection of the range [startStr, endStr] with the Resident's membership window,
 * or null if there is no overlap.
 */
export const clipToMembershipWindow = (resident, startStr, endStr) => {
  if (!overlapsPeriod(resident, startStr, endStr)) return null;

  const joinDate = toDhakaDateString(resident.joiningDate);
  const leaveDate = resident.leavingDate ? toDhakaDateString(resident.leavingDate) : null;

  const start = startStr > joinDate ? startStr : joinDate;
  const end = leaveDate && endStr > leaveDate ? leaveDate : endStr;

  return { start, end };
};

/**
 * Returns Residents overlapping the given range, with name/email populated from User.
 */
export const getActiveResidents = async (messId, startStr, endStr) => {
  const residents = await Resident.find({ messId }).populate('userId', 'name email').lean();

  return residents
    .filter((r) => overlapsPeriod(r, startStr, endStr))
    .map((r) => ({
      ...r,
      name: r.userId?.name || 'Unknown',
      email: r.userId?.email || '',
    }));
};

export default {
  getResidentByUser,
  isResidentActiveOn,
  overlapsPeriod,
  clipToMembershipWindow,
  getActiveResidents,
};