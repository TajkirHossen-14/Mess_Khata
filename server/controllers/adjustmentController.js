import mongoose from 'mongoose';
import Adjustment from '../models/Adjustment.js';
import Resident from '../models/Resident.js';
import Manager from '../models/Manager.js';
import User from '../models/User.js';
import { getPeriodForMess } from '../services/billingPeriodService.js';
import { overlapsPeriod } from '../services/membershipService.js';
import { calendarDateString } from '../utils/dateTime.js';

const isManagerCountGt1 = async (messId) => (await Manager.countDocuments({ messId })) > 1;

export const createAdjustment = async (req, res, next) => {
  try {
    const { residentId, billingPeriodId, amount, reason } = req.body;
    if (!mongoose.isValidObjectId(residentId) || !mongoose.isValidObjectId(billingPeriodId)) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    if (!Number.isSafeInteger(amount) || amount === 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a whole number of Taka and not zero' });
    }
    if (typeof reason !== 'string' || reason.trim().length < 3 || reason.trim().length > 300) {
      return res.status(400).json({ success: false, message: 'Reason must be 3-300 characters' });
    }
    const period = await getPeriodForMess(req.messId, billingPeriodId);
    const resident = await Resident.findOne({ _id: residentId, messId: req.messId });
    if (!resident) return res.status(404).json({ success: false, message: 'Resident not found' });
    const startStr = calendarDateString(period.startDate);
    const endStr = calendarDateString(period.endDate);
    if (!overlapsPeriod(resident, startStr, endStr)) {
      return res.status(409).json({ success: false, message: 'This Resident was not a member during this billing period' });
    }
    if (String(resident.userId) === String(req.user.id) && (await isManagerCountGt1(req.messId))) {
      return res.status(403).json({ success: false, message: 'With more than one Manager, you cannot change your own bill. Ask another Manager.' });
    }
    const adjustment = await Adjustment.create({
      residentId, billingPeriodId, amount, reason: reason.trim(), createdBy: req.user.id,
    });
    return res.status(201).json({ success: true, data: adjustment });
  } catch (err) { return next(err); }
};

export const listAdjustments = async (req, res, next) => {
  try {
    const { billingPeriodId, residentId } = req.query;
    if (!billingPeriodId) return res.status(400).json({ success: false, message: 'billingPeriodId is required' });
    await getPeriodForMess(req.messId, billingPeriodId);
    const managerView = req.user.roles.includes('manager') && req.query.scope !== 'me';
    const filter = { billingPeriodId };
    if (managerView) {
      if (residentId) filter.residentId = residentId;
    } else {
      const resident = await (await import('../services/membershipService.js')).getResidentByUser(req.user.id, req.messId);
      if (!resident) return res.status(403).json({ success: false, message: 'No resident profile in this mess' });
      filter.residentId = resident._id;
    }
    const adjustments = await Adjustment.find(filter).sort({ createdAt: -1 }).lean();
    const residents = await Resident.find({ messId: req.messId }).populate('userId', 'name').lean();
    const nameMap = new Map(residents.map((r) => [String(r._id), r.userId?.name || 'Unknown']));
    const users = await User.find({}).lean();
    const userNameMap = new Map(users.map((u) => [String(u._id), u.name]));
    const items = adjustments.map((a) => ({
      id: a._id,
      residentId: a.residentId,
      residentName: nameMap.get(String(a.residentId)) || 'Unknown',
      amount: a.amount,
      reason: a.reason,
      createdByName: userNameMap.get(String(a.createdBy)) || 'Unknown',
      createdAt: a.createdAt,
      isVoided: !!a.voidedAt,
      voidedAt: a.voidedAt,
      voidReason: a.voidReason || '',
    }));
    return res.status(200).json({ success: true, data: items });
  } catch (err) { return next(err); }
};

export const voidAdjustment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid id' });
    if (typeof reason !== 'string' || reason.trim().length < 3 || reason.trim().length > 300) {
      return res.status(400).json({ success: false, message: 'Reason must be 3-300 characters' });
    }
    const adjustment = await Adjustment.findById(id);
    if (!adjustment) return res.status(404).json({ success: false, message: 'Adjustment not found' });
    const period = await (await import('../models/BillingPeriod.js')).default.findById(adjustment.billingPeriodId);
    if (!period || String(period.messId) !== String(req.messId)) {
      return res.status(404).json({ success: false, message: 'Adjustment not found' });
    }
    if (adjustment.voidedAt) return res.status(409).json({ success: false, message: 'Already voided' });
    const resident = await Resident.findById(adjustment.residentId);
    if (resident && String(resident.userId) === String(req.user.id) && (await isManagerCountGt1(req.messId))) {
      return res.status(403).json({ success: false, message: 'With more than one Manager, you cannot change your own bill. Ask another Manager.' });
    }
    adjustment.voidedAt = new Date();
    adjustment.voidedBy = req.user.id;
    adjustment.voidReason = reason.trim();
    await adjustment.save();
    return res.status(200).json({ success: true, data: adjustment });
  } catch (err) { return next(err); }
};

export default { createAdjustment, listAdjustments, voidAdjustment };
