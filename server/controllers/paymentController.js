import mongoose from 'mongoose';
import BillingPeriod from '../models/BillingPeriod.js';
import Payment from '../models/Payment.js';
import { getResidentByUser } from '../services/membershipService.js';

const badRequest = (res, message) => res.status(400).json({ success: false, message });

export const submitPayment = async (req, res) => {
  try {
    const { amount, method, billingPeriodId, transactionReference } = req.body ?? {};
    if (amount === undefined || amount === null || amount === '') {
      return badRequest(res, 'amount is required');
    }
    const numericAmount = typeof amount === 'number' || typeof amount === 'string'
      ? Number(amount)
      : NaN;
    if (!Number.isSafeInteger(numericAmount) || numericAmount <= 0) {
      return badRequest(res, 'Amount must be a positive whole number of Taka');
    }
    if (!['cash', 'bKash', 'Nagad'].includes(method)) {
      return badRequest(res, 'Invalid payment method');
    }
    if (!billingPeriodId || !mongoose.isValidObjectId(billingPeriodId)) {
      return badRequest(res, 'A valid billingPeriodId is required');
    }

    let normalizedReference;
    if (transactionReference !== undefined && transactionReference !== null) {
      if (typeof transactionReference !== 'string') {
        return badRequest(res, 'transactionReference must be a string');
      }
      normalizedReference = transactionReference.trim();
      if (!normalizedReference || normalizedReference.length > 200) {
        return badRequest(res, 'transactionReference must contain 1 to 200 characters');
      }
    }

    const billingPeriod = await BillingPeriod.findOne({
      _id: billingPeriodId,
      messId: req.messId,
    }).select('_id');
    if (!billingPeriod) {
      return res.status(404).json({ success: false, message: 'Billing period not found for this mess' });
    }

    const resident = await getResidentByUser(req.user.id, req.messId);
    if (!resident) {
      return res.status(404).json({ success: false, message: 'Resident membership not found' });
    }

    const paymentData = {
      amount: numericAmount,
      method,
      billingPeriodId: billingPeriod._id,
      residentId: resident._id,
      status: 'pending',
    };
    if (normalizedReference !== undefined) paymentData.transactionReference = normalizedReference;

    const payment = await Payment.create(paymentData);
    return res.status(201).json({ success: true, data: payment });
  } catch {
    return res.status(500).json({ success: false, message: 'Unable to submit payment' });
  }
};

export default { submitPayment };
