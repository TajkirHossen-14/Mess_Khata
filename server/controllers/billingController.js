import { getBillingSummary, getMealRateSummary } from '../services/billingCalculationService.js';
import { getResidentByUser } from '../services/membershipService.js';
import { isManagerView } from '../utils/viewScope.js';

export const getMealRate = async (req, res, next) => {
  try {
    const { billingPeriodId } = req.query;
    if (!billingPeriodId) {
      return res.status(400).json({ success: false, message: 'billingPeriodId is required' });
    }

    const summary = await getMealRateSummary(req.messId, billingPeriodId);
    if (isManagerView(req)) {
      return res.status(200).json({ success: true, data: summary });
    }

    const resident = await getResidentByUser(req.user.id, req.messId);
    if (!resident) {
      return res.status(403).json({
        success: false,
        message: 'No resident profile in this mess',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...summary,
        residents: summary.residents.filter((row) => row.residentId === String(resident._id)),
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getResidentView = async (req, res, summary) => {
  if (isManagerView(req)) {
    return res.status(200).json({ success: true, data: summary });
  }
  const resident = await getResidentByUser(req.user.id, req.messId);
  if (!resident) {
    return res.status(403).json({ success: false, message: 'No resident profile in this mess' });
  }
  return res.status(200).json({
    success: true,
    data: {
      ...summary,
      residents: summary.residents.filter((row) => row.residentId === String(resident._id)),
    },
  });
};

export const getBilling = async (req, res, next) => {
  try {
    const { billingPeriodId } = req.query;
    if (!billingPeriodId) {
      return res.status(400).json({ success: false, message: 'billingPeriodId is required' });
    }
    const summary = await getBillingSummary(req.messId, billingPeriodId);
    return await getResidentView(req, res, summary);
  } catch (error) {
    return next(error);
  }
};

export default { getMealRate, getBilling };
