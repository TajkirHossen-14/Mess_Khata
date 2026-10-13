import BillingPeriod from '../models/BillingPeriod.js';
import MealRecord from '../models/MealRecord.js';
import { toCalendarDate } from '../utils/dateTime.js';

export const getBillingPeriods = async (req, res, next) => {
  try {
    const periods = await BillingPeriod.find({ messId: req.messId }).sort({ startDate: -1 });
    return res.status(200).json({ success: true, data: periods });
  } catch (error) {
    return next(error);
  }
};

export const createBillingPeriod = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.body ?? {};
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'startDate and endDate are required' });
    }

    const start = toCalendarDate(startDate);
    const end = toCalendarDate(endDate);
    if (end.getTime() < start.getTime()) {
      return res.status(400).json({ success: false, message: 'endDate must be on or after startDate' });
    }

    const period = await BillingPeriod.create({
      messId: req.messId,
      startDate: start,
      endDate: end,
    });

    return res.status(201).json({ success: true, data: period });
  } catch (error) {
    return next(error);
  }
};

export const updateBillingPeriod = async (req, res, next) => {
  try {
    const period = await BillingPeriod.findOne({ _id: req.params.id, messId: req.messId });
    if (!period) {
      return res.status(404).json({ success: false, message: 'Billing period not found' });
    }

    const { startDate, endDate } = req.body ?? {};
    if (startDate) period.startDate = toCalendarDate(startDate);
    if (endDate) period.endDate = toCalendarDate(endDate);

    if (period.endDate.getTime() < period.startDate.getTime()) {
      return res.status(400).json({ success: false, message: 'endDate must be on or after startDate' });
    }

    await period.save();
    return res.status(200).json({ success: true, data: period });
  } catch (error) {
    return next(error);
  }
};

export const deleteBillingPeriod = async (req, res, next) => {
  try {
    const period = await BillingPeriod.findOne({ _id: req.params.id, messId: req.messId });
    if (!period) {
      return res.status(404).json({ success: false, message: 'Billing period not found' });
    }

    const recordCount = await MealRecord.countDocuments({ billingPeriodId: period._id });
    if (recordCount > 0) {
      return res.status(409).json({ success: false, message: 'This billing period has meal records and cannot be deleted.' });
    }

    await period.deleteOne();
    return res.status(200).json({ success: true, message: 'Billing period deleted successfully' });
  } catch (error) {
    return next(error);
  }
};

export default {
  getBillingPeriods,
  createBillingPeriod,
  updateBillingPeriod,
  deleteBillingPeriod,
};
