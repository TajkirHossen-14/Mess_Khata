import mongoose from 'mongoose';
import BillingPeriod from '../models/BillingPeriod.js';
import Manager from '../models/Manager.js';
import Payment from '../models/Payment.js';
import Resident from '../models/Resident.js';
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

const reviewPayment = async (req, res, status) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return badRequest(res, 'Invalid payment ID');
    }

    const manager = await Manager.findOne({
      userId: req.user.id,
      messId: req.messId,
    }).select('_id');
    if (!manager) {
      return res.status(403).json({ success: false, message: 'Manager membership not found for this mess' });
    }

    const managerCount = await Manager.countDocuments({ messId: req.messId });
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const billingPeriod = await BillingPeriod.findOne({
      _id: payment.billingPeriodId,
      messId: req.messId,
    }).select('_id');
    if (!billingPeriod) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const resident = await Resident.findOne({
      _id: payment.residentId,
      messId: req.messId,
    }).select('userId');
    if (!resident) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    if (managerCount > 1 && String(resident.userId) === String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Managers cannot review their own payment claims' });
    }

    const updatedPayment = await Payment.findOneAndUpdate(
      {
        _id: payment._id,
        billingPeriodId: payment.billingPeriodId,
        residentId: payment.residentId,
        status: 'pending',
      },
      {
        $set: {
          status,
          reviewedBy: manager._id,
          reviewedAt: new Date(),
        },
      },
      { new: true, runValidators: true }
    );
    if (!updatedPayment) {
      return res.status(409).json({ success: false, message: 'Payment has already been processed' });
    }

    return res.status(200).json({ success: true, data: updatedPayment });
  } catch {
    return res.status(500).json({ success: false, message: 'Unable to review payment' });
  }
};

export const confirmPayment = (req, res) => reviewPayment(req, res, 'confirmed');
export const rejectPayment = (req, res) => reviewPayment(req, res, 'rejected');

export default { submitPayment, confirmPayment, rejectPayment };
