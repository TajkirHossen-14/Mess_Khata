import MealRecord from '../models/MealRecord.js';
import BillingPeriod from '../models/BillingPeriod.js';
import { syncMealRecordsForPeriod, getMealRecordsByPeriod } from '../services/mealRecordService.js';

export const listMealRecords = async (req, res, next) => {
  try {
    const { billingPeriodId } = req.query;
    if (!billingPeriodId) {
      return res.status(400).json({ success: false, message: 'billingPeriodId is required' });
    }

    const period = await BillingPeriod.findOne({ _id: billingPeriodId, messId: req.messId }).select('_id');
    if (!period) {
      return res.status(404).json({ success: false, message: 'Billing period not found' });
    }

    const records = await getMealRecordsByPeriod({ messId: req.messId, billingPeriodId });
    return res.status(200).json({ success: true, data: records });
  } catch (error) {
    return next(error);
  }
};

export const generateMealRecords = async (req, res, next) => {
  try {
    const { billingPeriodId } = req.body ?? {};
    if (!billingPeriodId) {
      return res.status(400).json({ success: false, message: 'billingPeriodId is required' });
    }

    const period = await BillingPeriod.findOne({ _id: billingPeriodId, messId: req.messId }).select('_id');
    if (!period) {
      return res.status(404).json({ success: false, message: 'Billing period not found' });
    }

    const records = await syncMealRecordsForPeriod({ messId: req.messId, billingPeriodId });
    return res.status(200).json({ success: true, data: records });
  } catch (error) {
    return next(error);
  }
};

export default {
  listMealRecords,
  generateMealRecords,
};
