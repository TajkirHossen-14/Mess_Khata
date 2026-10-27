import { getResidentByUser } from '../services/membershipService.js';
import {
  getResidentMealWindow,
  declareMeal as declareMealService,
} from '../services/mealWindowService.js';
import MealDeclaration from '../models/MealDeclaration.js';
import MealType from '../models/MealType.js';
import { todayDhaka, toCalendarDate } from '../utils/dateTime.js';

export const getMealDeclarations = async (req, res, next) => {
  try {
    const resident = await getResidentByUser(req.user.id, req.messId);
    if (!resident) {
      const err = new Error('Resident record not found for this mess');
      err.statusCode = 404;
      throw err;
    }

    const dateStr = req.query.date || todayDhaka();
    const data = await getResidentMealWindow(resident, dateStr);

    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
};

export const declareMeal = async (req, res, next) => {
  try {
    const resident = await getResidentByUser(req.user.id, req.messId);
    if (!resident) {
      const err = new Error('Resident record not found for this mess');
      err.statusCode = 404;
      throw err;
    }

    const { mealTypeId, date, count = 1 } = req.body || {};
    if (!mealTypeId || !date) {
      const err = new Error('mealTypeId and date are required');
      err.statusCode = 400;
      throw err;
    }

    const declaration = await declareMealService({
      resident,
      mealTypeId,
      dateStr: date,
      count,
    });

    return res.json({
      success: true,
      data: declaration,
      message: 'Meal declaration saved successfully',
    });
  } catch (err) {
    return next(err);
  }
};

export const getDailySummary = async (req, res, next) => {
  try {
    const dateStr = req.query.date || todayDhaka();
    const calendarDate = toCalendarDate(dateStr);

    const mealTypes = await MealType.find({
      messId: req.messId,
      isActive: true,
    }).sort({ time: 1 });

    const declarations = await MealDeclaration.find({
      messId: req.messId,
      date: calendarDate,
    });

    const summary = mealTypes.map((mt) => {
      const matching = declarations.filter(
        (d) => d.mealTypeId.toString() === mt._id.toString()
      );
      const totalCount = matching.reduce((sum, d) => sum + d.count, 0);

      return {
        mealTypeId: mt._id,
        name: mt.name,
        time: mt.time,
        totalMeals: totalCount,
        headCount: matching.filter((d) => d.count > 0).length,
      };
    });

    return res.json({
      success: true,
      data: {
        date: dateStr,
        summary,
      },
    });
  } catch (err) {
    return next(err);
  }
};

export default {
  getMealDeclarations,
  declareMeal,
  getDailySummary,
};
