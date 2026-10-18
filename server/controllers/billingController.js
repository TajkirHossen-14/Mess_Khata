import {
  getMealRateSummary,
  getBillingSummary,
} from "../services/billingCalculationService.js";
import { getResidentByUser } from "../services/membershipService.js";
import HttpError from "../utils/HttpError.js";
import { isManagerView } from "../utils/viewScope.js";
export async function mealRate(req, res, next) {
  try {
    if (!req.query.billingPeriodId)
      throw new HttpError(400, "billingPeriodId is required");
    const data = await getMealRateSummary(
      req.messId,
      req.query.billingPeriodId,
    );
    if (!isManagerView(req)) {
      const resident = await getResidentByUser(req.user.id, req.messId);
      if (!resident)
        throw new HttpError(403, "No resident profile in this mess");
      data.residents = data.residents.filter(
        (r) => r.residentId.toString() === resident._id.toString(),
      );
    }
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
export async function billingSummary(req, res, next) {
  try {
    if (!req.query.billingPeriodId)
      throw new HttpError(400, "billingPeriodId is required");
    const data = await getBillingSummary(req.messId, req.query.billingPeriodId);
    if (!isManagerView(req)) {
      const resident = await getResidentByUser(req.user.id, req.messId);
      if (!resident)
        throw new HttpError(403, "No resident profile in this mess");
      data.residents = data.residents.filter(
        (r) => r.residentId.toString() === resident._id.toString(),
      );
    }
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
