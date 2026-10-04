import mongoose from 'mongoose';
import BillingPeriod from '../models/BillingPeriod.js';
import Expense from '../models/Expense.js';

const categories = ['grocery', 'utility', 'fixed', 'asset', 'other'];

const badRequest = (res, message) => res.status(400).json({ success: false, message });

export const createExpense = async (req, res) => {
  try {
    const { category, amount, date, billingPeriodId } = req.body ?? {};

    if (category == null || category === '' || amount == null || amount === '' || date == null || date === '' || billingPeriodId == null || billingPeriodId === '') {
      return badRequest(res, 'category, amount, date, and billingPeriodId are required');
    }
    if (!categories.includes(category)) {
      return badRequest(res, 'Invalid expense category');
    }

    const numericAmount = typeof amount === 'number' || typeof amount === 'string' ? Number(amount) : NaN;
    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || !Number.isInteger(numericAmount)) {
      return badRequest(res, 'Amount must be a positive whole number of Taka');
    }

    const expenseDate = new Date(date);
    if (Number.isNaN(expenseDate.getTime())) {
      return badRequest(res, 'Invalid expense date');
    }
    if (!mongoose.isValidObjectId(billingPeriodId)) {
      return badRequest(res, 'Invalid billingPeriodId');
    }

    const billingPeriod = await BillingPeriod.findById(billingPeriodId);
    if (!billingPeriod || String(billingPeriod.messId) !== String(req.messId)) {
      return badRequest(res, 'Billing period was not found for this mess');
    }

    const expense = await Expense.create({
      category,
      amount: numericAmount,
      date: expenseDate,
      billingPeriodId,
      createdBy: req.user.id,
    });
    return res.status(201).json({ success: true, data: expense });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to create expense' });
  }
};

export const getExpenses = async (req, res) => {
  try {
    if (!req.messId) {
      return badRequest(res, 'Mess context is required');
    }

    const { category, billingPeriodId } = req.query;
    if (category !== undefined && !categories.includes(category)) {
      return badRequest(res, 'Invalid expense category');
    }

    let selectedPeriodId;
    if (billingPeriodId !== undefined) {
      if (!mongoose.isValidObjectId(billingPeriodId)) {
        return badRequest(res, 'Invalid billingPeriodId');
      }
      const billingPeriod = await BillingPeriod.findById(billingPeriodId).select('messId');
      if (!billingPeriod || String(billingPeriod.messId) !== String(req.messId)) {
        return badRequest(res, 'Billing period was not found for this mess');
      }
      selectedPeriodId = billingPeriod._id;
    }

    const periods = await BillingPeriod.find({ messId: req.messId }).select('_id');
    const periodIds = periods.map((period) => period._id);
    const filter = { billingPeriodId: { $in: periodIds } };
    if (category !== undefined) filter.category = category;
    if (selectedPeriodId) filter.billingPeriodId = selectedPeriodId;

    const expenses = await Expense.find(filter).sort({ date: -1 });
    return res.status(200).json({ success: true, data: expenses });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to retrieve expenses' });
  }
};
