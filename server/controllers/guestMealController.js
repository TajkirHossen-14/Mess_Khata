import GuestMeal from '../models/GuestMeal.js';
import MealType from '../models/MealType.js';
import Resident from '../models/Resident.js';
import HttpError from '../utils/HttpError.js';
import { addDays, calendarDateString, getCutoffAt, toCalendarDate, todayDhaka } from '../utils/dateTime.js';
import { getResidentByUser } from '../services/membershipService.js';
import { assertCanChangeMeal } from '../services/mealWindowService.js';

const getOwn = async (req) => {
  const resident = await getResidentByUser(req.user.id, req.messId);
  if (!resident) throw new HttpError(404, 'Resident membership not found');
  return resident;
};

const saveGuestMeal = async (req, res, next) => {
  try {
    const { mealTypeId, date, count } = req.body;
    if (!Number.isInteger(count) || count < 1) {
      throw new HttpError(400, 'Guest count must be an integer of at least one');
    }
    const resident = await getOwn(req);
    const mealType = await MealType.findOne({ _id: mealTypeId, messId: req.messId });
    if (!mealType) throw new HttpError(404, 'Meal type not found');

    assertCanChangeMeal({ resident, mealType, dateStr: date });

    const meal = await GuestMeal.findOneAndUpdate(
      { responsibleResidentId: resident._id, mealTypeId, date: toCalendarDate(date) },
      { $set: { count } },
      { upsert: true, new: true }
    );
    return res.status(201).json({ success: true, data: meal });
  } catch (error) {
    return next(error);
  }
};

const removeGuestMeal = async (req, res, next) => {
  try {
    const resident = await getOwn(req);
    const meal = await GuestMeal.findOne({
      _id: req.params.id,
      responsibleResidentId: resident._id,
    }).populate('mealTypeId');

    if (!meal) throw new HttpError(404, 'Guest meal not found');

    assertCanChangeMeal({
      resident,
      mealType: meal.mealTypeId,
      dateStr: calendarDateString(meal.date),
    });

    await meal.deleteOne();
    return res.json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    return next(error);
  }
};

const listGuestMeals = async (req, res, next) => {
  try {
    const from = req.query.from ?? todayDhaka();
    const to = req.query.to ?? addDays(from, 30);
    const managerView = req.user.roles.includes('manager') && req.query.scope !== 'me';

    const query = {
      date: { $gte: toCalendarDate(from), $lte: toCalendarDate(to) },
    };

    if (managerView) {
      const residents = await Resident.find({ messId: req.messId }).select('_id');
      query.responsibleResidentId = { $in: residents.map((r) => r._id) };
    } else {
      const own = await getOwn(req);
      query.responsibleResidentId = own._id;
    }

    const items = await GuestMeal.find(query)
      .populate('mealTypeId', 'name time deadlineHoursBefore')
      .populate({ path: 'responsibleResidentId', populate: { path: 'userId', select: 'name' } });

    return res.json({
      success: true,
      data: items.map((item) => ({
        id: item.id,
        date: calendarDateString(item.date),
        mealTypeId: item.mealTypeId.id,
        mealName: item.mealTypeId.name,
        count: item.count,
        responsible: {
          residentId: item.responsibleResidentId.id,
          name: item.responsibleResidentId.userId?.name ?? 'Unknown',
        },
        isLocked: new Date() >= getCutoffAt(calendarDateString(item.date), item.mealTypeId),
      })),
    });
  } catch (error) {
    return next(error);
  }
};

export { saveGuestMeal, removeGuestMeal, listGuestMeals };
