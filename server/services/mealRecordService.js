import MealDeclaration from '../models/MealDeclaration.js';
import MealRecord from '../models/MealRecord.js';
import Resident from '../models/Resident.js';
import User from '../models/User.js';
import { toDhakaDateString } from '../utils/dateTime.js';

export const buildMealRecordSummary = async ({ messId, billingPeriodId }) => {
  if (!messId || !billingPeriodId) {
    const err = new Error('messId and billingPeriodId are required');
    err.statusCode = 400;
    throw err;
  }

  const residents = await Resident.find({ messId }).select('_id userId name').lean();
  const residentMap = new Map(residents.map((resident) => [String(resident._id), resident]));

  const declarations = await MealDeclaration.find({ messId, billingPeriodId }).lean();
  const grouped = new Map();

  for (const declaration of declarations) {
    const key = `${String(declaration.residentId)}:${toDhakaDateString(declaration.date)}`;
    const existing = grouped.get(key) || { ownMealCount: 0, guestMealCount: 0 };
    existing.ownMealCount += Number(declaration.count || 0);
    grouped.set(key, existing);
  }

  const records = [];

  for (const [key, value] of grouped.entries()) {
    const [residentId, dateStr] = key.split(':');
    const resident = residentMap.get(residentId);
    if (!resident) continue;

    const totalMealCount = value.ownMealCount + value.guestMealCount;
    records.push({
      messId,
      billingPeriodId,
      residentId,
      date: new Date(`${dateStr}T00:00:00Z`),
      ownMealCount: value.ownMealCount,
      guestMealCount: value.guestMealCount,
      totalMealCount,
      residentName: resident.name || 'Unknown resident',
    });
  }

  return records;
};

export const syncMealRecordsForPeriod = async ({ messId, billingPeriodId }) => {
  const summary = await buildMealRecordSummary({ messId, billingPeriodId });

  const writes = summary.map(async (record) => {
    await MealRecord.findOneAndUpdate(
      {
        messId,
        billingPeriodId,
        residentId: record.residentId,
        date: record.date,
      },
      {
        ...record,
        totalMealCount: record.ownMealCount + record.guestMealCount,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  });

  await Promise.all(writes);
  return summary;
};

export const getMealRecordsByPeriod = async ({ messId, billingPeriodId }) => {
  if (!messId || !billingPeriodId) {
    const err = new Error('messId and billingPeriodId are required');
    err.statusCode = 400;
    throw err;
  }

  const records = await MealRecord.find({ messId, billingPeriodId })
    .populate('residentId', 'name email')
    .sort({ date: 1 })
    .lean();

  return records.map((record) => ({
    ...record,
    residentName: record.residentId?.name || 'Unknown resident',
  }));
};

export default {
  buildMealRecordSummary,
  syncMealRecordsForPeriod,
  getMealRecordsByPeriod,
};
