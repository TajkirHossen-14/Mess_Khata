import Resident from '../models/Resident.js';
import { toDhakaDateString, toCalendarDate } from '../utils/dateTime.js';
import { getResidentByUser } from '../services/membershipService.js';

export const getResidents = async (req, res, next) => {
  try {
    const residents = await Resident.find({ messId: req.messId })
      .populate('userId', 'name email')
      .sort({ joiningDate: 1 });

    const today = toDhakaDateString(new Date());

    const data = residents.map((r) => {
      const joiningDateStr = toDhakaDateString(r.joiningDate);
      const leavingDateStr = r.leavingDate ? toDhakaDateString(r.leavingDate) : null;
      const isActiveToday = joiningDateStr <= today && (!leavingDateStr || today <= leavingDateStr);

      return {
        id: r._id,
        userId: r.userId?._id,
        name: r.userId?.name || 'Unknown',
        email: r.userId?.email || '',
        joiningDate: joiningDateStr,
        leavingDate: leavingDateStr,
        isActiveToday,
      };
    });

    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
};

export const getMyMembership = async (req, res, next) => {
  try {
    const resident = await getResidentByUser(req.user.id, req.messId);
    if (!resident) {
      const err = new Error('You are not a resident in this mess');
      err.statusCode = 404;
      throw err;
    }

    const today = toDhakaDateString(new Date());
    const joiningDateStr = toDhakaDateString(resident.joiningDate);
    const leavingDateStr = resident.leavingDate ? toDhakaDateString(resident.leavingDate) : null;
    const isActiveToday = joiningDateStr <= today && (!leavingDateStr || today <= leavingDateStr);

    return res.json({
      success: true,
      data: {
        id: resident._id,
        joiningDate: joiningDateStr,
        leavingDate: leavingDateStr,
        isActiveToday,
      },
    });
  } catch (err) {
    return next(err);
  }
};

export const updateMembership = async (req, res, next) => {
  try {
    const { joiningDate, leavingDate } = req.body || {};

    const resident = await Resident.findById(req.params.id);
    if (!resident) {
      const err = new Error('Resident not found');
      err.statusCode = 404;
      throw err;
    }
    if (resident.messId.toString() !== req.messId) {
      const err = new Error('Resident not found');
      err.statusCode = 404;
      throw err;
    }

    if (joiningDate !== undefined) {
      const jd = toCalendarDate(joiningDate);
      resident.joiningDate = jd;
    }

    if (leavingDate !== undefined) {
      if (leavingDate === null) {
        resident.leavingDate = null;
      } else {
        const ld = toCalendarDate(leavingDate);
        const joinD = toDhakaDateString(resident.joiningDate);
        const leaveD = toDhakaDateString(ld);
        if (leaveD < joinD) {
          const err = new Error('Leaving date cannot be before joining date');
          err.statusCode = 400;
          throw err;
        }
        resident.leavingDate = ld;
      }
    }

    await resident.save();

    const joiningDateStr = toDhakaDateString(resident.joiningDate);
    const leavingDateStr = resident.leavingDate ? toDhakaDateString(resident.leavingDate) : null;

    return res.json({
      success: true,
      data: {
        id: resident._id,
        joiningDate: joiningDateStr,
        leavingDate: leavingDateStr,
      },
    });
  } catch (err) {
    return next(err);
  }
};