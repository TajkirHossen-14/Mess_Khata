import mongoose from "mongoose";
import BillingPeriod from "../models/BillingPeriod.js";
import HttpError from "../utils/HttpError.js";
export async function getPeriodForMess(messId, id) {
  if (!mongoose.isValidObjectId(id))
    throw new HttpError(400, "Invalid billing period id");
  const period = await BillingPeriod.findOne({ _id: id, messId });
  if (!period) throw new HttpError(404, "Billing period not found");
  return period;
}
