import mongoose from 'mongoose';
import MealType from '../models/MealType.js';
import { ensureDefaultMealTypes, toMealTypeDTO } from '../services/mealTypeService.js';
import HttpError from '../utils/HttpError.js';

export const getMealTypes = async (req, res, next) => {
  try {
    await ensureDefaultMealTypes(req.messId);
    const query = { messId: req.messId };
    if (req.query.activeOnly === 'true') {
      query.isActive = true;
    }
    const mealTypes = await MealType.find(query).sort({ time: 1 });
    res.json({ success: true, data: mealTypes.map(toMealTypeDTO) });
  } catch (err) {
    next(err);
  }
};

export const createMealType = async (req, res, next) => {
  try {
    const { name, time, deadlineHoursBefore } = req.body;
    const mealType = await MealType.create({
      messId: req.messId,
      name,
      time,
      deadlineHoursBefore,
    });
    res.status(201).json({ success: true, data: toMealTypeDTO(mealType) });
  } catch (err) {
    if (err.code === 11000) {
      next(new HttpError(409, 'A meal type with this name already exists'));
    } else {
      next(err);
    }
  }
};

export const updateMealType = async (req, res, next) => {
  try {
    const { name, time, deadlineHoursBefore, isActive } = req.body;
    const mealType = await MealType.findOne({ _id: req.params.id, messId: req.messId });
    if (!mealType) {
      throw new HttpError(404, 'Meal type not found');
    }
    if (name !== undefined) mealType.name = name;
    if (time !== undefined) mealType.time = time;
    if (deadlineHoursBefore !== undefined) mealType.deadlineHoursBefore = deadlineHoursBefore;
    if (isActive !== undefined) mealType.isActive = isActive;
    await mealType.save();
    res.json({ success: true, data: toMealTypeDTO(mealType) });
  } catch (err) {
    if (err.code === 11000) {
      next(new HttpError(409, 'A meal type with this name already exists'));
    } else {
      next(err);
    }
  }
};

export const deleteMealType = async (req, res, next) => {
  try {
    const mealTypeId = req.params.id;
    const mealType = await MealType.findOne({ _id: mealTypeId, messId: req.messId });
    if (!mealType) {
      throw new HttpError(404, 'Meal type not found');
    }

    // A meal type referenced by any declaration or guest meal has history and
    // can only be deactivated, never deleted. Those models may not exist yet,
    // so check through mongoose.models.
    const hasDeclarations = mongoose.models.MealDeclaration
      ? await mongoose.models.MealDeclaration.exists({ mealTypeId })
      : false;
    const hasGuestMeals = mongoose.models.GuestMeal
      ? await mongoose.models.GuestMeal.exists({ mealTypeId })
      : false;

    if (hasDeclarations || hasGuestMeals) {
      throw new HttpError(409, 'This meal type has history - deactivate it instead');
    }

    await mealType.deleteOne();
    res.json({ success: true, data: { id: mealTypeId } });
  } catch (err) {
    next(err);
  }
};
