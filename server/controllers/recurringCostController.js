import mongoose from 'mongoose';
import BillingPeriod from '../models/BillingPeriod.js';
import RecurringCost, { RECURRING_CATEGORIES } from '../models/RecurringCost.js';
import { applyRecurringCostsToPeriod } from '../services/recurringCostService.js';

const badRequest = (res, message) =>
  res.status(400).json({ success: false, message });

const isValidationError = (error) =>
  error instanceof mongoose.Error.ValidationError || error.name === 'ValidationError';

const validateName = (value) => {
  if (typeof value !== 'string') {
    return { error: 'Name must be a non-empty string of at most 80 characters' };
  }

  const name = value.trim();
  if (!name || name.length > 80) {
    return { error: 'Name must be a non-empty string of at most 80 characters' };
  }

  return { value: name };
};

const validateCategory = (value) => {
  if (!RECURRING_CATEGORIES.includes(value)) {
    return { error: 'Category must be fixed or utility' };
  }

  return { value };
};

const validateAmount = (value) => {
  const amount = typeof value === 'number' || typeof value === 'string'
    ? Number(value)
    : NaN;

  if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) {
    return { error: 'Amount must be a positive whole number' };
  }

  return { value: amount };
};

export const createRecurringCost = async (req, res, next) => {
  if (!req.messId) {
    return badRequest(res, 'Mess context is required');
  }

  const body = req.body ?? {};
  const name = validateName(body.name);
  if (name.error) return badRequest(res, name.error);

  const category = validateCategory(body.category);
  if (category.error) return badRequest(res, category.error);

  const amount = validateAmount(body.amount);
  if (amount.error) return badRequest(res, amount.error);

  try {
    const createdRecord = await RecurringCost.create({
      name: name.value,
      category: category.value,
      amount: amount.value,
      messId: req.messId,
      createdBy: req.user.id,
      isActive: true,
    });

    return res.status(201).json({ success: true, data: createdRecord });
  } catch (error) {
    if (isValidationError(error)) {
      return badRequest(res, error.message);
    }
    return next(error);
  }
};

export const getRecurringCosts = async (req, res, next) => {
  if (!req.messId) {
    return badRequest(res, 'Mess context is required');
  }

  const { isActive } = req.query;
  if (isActive !== undefined && isActive !== 'true' && isActive !== 'false') {
    return badRequest(res, 'isActive must be true or false');
  }

  try {
    const filter = { messId: req.messId };
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const records = await RecurringCost.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: records });
  } catch (error) {
    return next(error);
  }
};

export const updateRecurringCost = async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return badRequest(res, 'Invalid recurring cost ID');
  }
  if (!req.messId) {
    return badRequest(res, 'Mess context is required');
  }

  const body = req.body ?? {};
  const update = {};

  if (Object.hasOwn(body, 'name')) {
    const name = validateName(body.name);
    if (name.error) return badRequest(res, name.error);
    update.name = name.value;
  }

  if (Object.hasOwn(body, 'category')) {
    const category = validateCategory(body.category);
    if (category.error) return badRequest(res, category.error);
    update.category = category.value;
  }

  if (Object.hasOwn(body, 'amount')) {
    const amount = validateAmount(body.amount);
    if (amount.error) return badRequest(res, amount.error);
    update.amount = amount.value;
  }

  if (Object.hasOwn(body, 'isActive')) {
    if (typeof body.isActive !== 'boolean') {
      return badRequest(res, 'isActive must be a Boolean');
    }
    update.isActive = body.isActive;
  }

  if (Object.keys(update).length === 0) {
    return badRequest(res, 'At least one updatable field is required');
  }

  try {
    const updatedRecord = await RecurringCost.findOneAndUpdate(
      { _id: id, messId: req.messId },
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!updatedRecord) {
      return res.status(404).json({ success: false, message: 'Recurring cost not found' });
    }

    return res.status(200).json({ success: true, data: updatedRecord });
  } catch (error) {
    if (isValidationError(error)) {
      return badRequest(res, error.message);
    }
    return next(error);
  }
};

export const applyToBillingPeriod = async (req, res, next) => {
  if (!req.messId) {
    return badRequest(res, 'Mess context is required');
  }

  const { billingPeriodId } = req.body ?? {};
  if (!billingPeriodId || !mongoose.Types.ObjectId.isValid(billingPeriodId)) {
    return badRequest(res, 'A valid billingPeriodId is required');
  }

  try {
    const billingPeriod = await BillingPeriod.findOne({
      _id: billingPeriodId,
      messId: req.messId,
    });

    if (!billingPeriod) {
      return res.status(404).json({ success: false, message: 'Billing period not found' });
    }

    const { created, skipped } = await applyRecurringCostsToPeriod(billingPeriod);
    return res.status(200).json({
      success: true,
      data: { billingPeriodId: billingPeriod._id, created, skipped },
    });
  } catch (error) {
    return next(error);
  }
};
