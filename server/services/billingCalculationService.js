import { computeMealRecords } from './mealRecordService.js';
import { getPeriodForMess } from './billingPeriodService.js';
import { sumExpensesByCategory } from './expenseTotalsService.js';
import { allocateMealCosts, combineCosts, computeBalance } from '../utils/billingMath.js';
import { calendarDateString, todayDhaka } from '../utils/dateTime.js';
import { getFixedCostShares } from './fixedCostShareService.js';
import Adjustment from '../models/Adjustment.js';
import Payment from '../models/Payment.js';

export const getMealRateSummary = async (messId, billingPeriodId, now = new Date()) => {
  const period = await getPeriodForMess(messId, billingPeriodId);
  const { records, messTotals } = await computeMealRecords(messId, billingPeriodId);

  for (const record of records) {
    if (record.totalMealCount !== record.ownMealCount + record.guestMealCount) {
      throw new Error('Meal record totals do not match own and guest meals');
    }
  }
  if (messTotals.totalMealCount !== messTotals.ownMealCount + messTotals.guestMealCount) {
    throw new Error('Mess meal totals do not match own and guest meals');
  }

  const totalFoodCost = (await sumExpensesByCategory(billingPeriodId)).grocery;
  const allocated = allocateMealCosts({
    totalFoodCost,
    residents: records.map((record) => ({
      residentId: record.residentId,
      billableMeals: record.totalMealCount,
    })),
  });
  const totalMealCost = allocated.allocations.reduce((sum, allocation) => sum + allocation.mealCost, 0);
  if (totalMealCost + allocated.unallocated !== totalFoodCost) {
    throw new Error('Meal rate summary does not balance');
  }

  const today = todayDhaka(now);
  const startDate = calendarDateString(period.startDate);
  const endDate = calendarDateString(period.endDate);
  let periodStatus;
  if (today < startDate) periodStatus = 'upcoming';
  else if (today > endDate) periodStatus = 'ended';
  else periodStatus = 'in_progress';

  const warnings = [...allocated.warnings];
  if (periodStatus !== 'ended') warnings.push('PERIOD_NOT_ENDED');

  return {
    billingPeriodId: String(period._id),
    period: { startDate, endDate },
    periodStatus,
    totalFoodCost,
    totalMeals: {
      own: messTotals.ownMealCount,
      guest: messTotals.guestMealCount,
      billable: messTotals.totalMealCount,
    },
    mealRate: allocated.mealRate,
    residents: records.map((record, index) => ({
      residentId: record.residentId,
      name: record.name,
      ownMealCount: record.ownMealCount,
      guestMealCount: record.guestMealCount,
      billableMeals: record.totalMealCount,
      mealCost: allocated.allocations[index].mealCost,
    })),
    totalMealCost,
    unallocatedFoodCost: allocated.unallocated,
    warnings,
  };
};

export const getBillingSummary = async (messId, billingPeriodId, now = new Date()) => {
  const mealSummary = await getMealRateSummary(messId, billingPeriodId, now);
  const fixed = await getFixedCostShares(messId, billingPeriodId);
  const expenseTotals = await sumExpensesByCategory(billingPeriodId);
  if (fixed.total !== expenseTotals.fixed + expenseTotals.utility
    || fixed.shares.reduce((sum, item) => sum + item.share, 0) !== fixed.total) {
    throw new Error('Fixed-cost shares do not match the fixed-cost total');
  }

  const combined = combineCosts({
    mealRows: mealSummary.residents.map((row) => ({ ...row })),
    fixedShares: fixed.shares,
  });
  const [adjustments, payments] = await Promise.all([
    Adjustment.find({ billingPeriodId, voidedAt: null }).lean(),
    Payment.find({ billingPeriodId }).lean(),
  ]);
  const adjustmentsByResident = new Map();
  const paymentsByResident = new Map();
  const summaryResidentIds = new Set(combined.rows.map((row) => String(row.residentId)));
  let unmatched = false;
  for (const adjustment of adjustments) {
    const key = String(adjustment.residentId);
    if (!summaryResidentIds.has(key)) unmatched = true;
    if (!adjustmentsByResident.has(key)) adjustmentsByResident.set(key, []);
    adjustmentsByResident.get(key).push(adjustment);
  }
  for (const payment of payments) {
    const key = String(payment.residentId);
    if (!summaryResidentIds.has(key)) unmatched = true;
    if (!paymentsByResident.has(key)) paymentsByResident.set(key, []);
    paymentsByResident.get(key).push(payment);
  }

  let totalAdjustmentsNet = 0;
  let totalConfirmedPayments = 0;
  let totalPendingPayments = 0;
  let totalOutstanding = 0;
  const residents = combined.rows.map((row) => {
    const balance = computeBalance({
      subtotal: row.subtotal,
      adjustments: adjustmentsByResident.get(String(row.residentId)) || [],
      payments: paymentsByResident.get(String(row.residentId)) || [],
    });
    totalAdjustmentsNet += balance.adjustmentsNet;
    totalConfirmedPayments += balance.confirmedPayments;
    totalPendingPayments += balance.pendingPayments;
    totalOutstanding += balance.outstanding;
    return { ...row, ...balance };
  });
  const warnings = [...mealSummary.warnings];
  if (expenseTotals.other > 0) warnings.push('OTHER_EXPENSES_NOT_BILLED');
  if (expenseTotals.asset > 0) warnings.push('ASSET_EXPENSES_NOT_BILLED');
  if (unmatched) warnings.push('UNMATCHED_ADJUSTMENTS_OR_PAYMENTS');
  const totals = {
    foodCost: mealSummary.totalFoodCost,
    mealCost: combined.totals.mealCost,
    unallocatedFoodCost: mealSummary.unallocatedFoodCost,
    fixedCost: combined.totals.fixedCost,
    subtotal: combined.totals.subtotal,
    adjustmentsNet: totalAdjustmentsNet,
    confirmedPayments: totalConfirmedPayments,
    pendingPayments: totalPendingPayments,
    outstanding: totalOutstanding,
  };
  if (Object.values(totals).some((amount) => !Number.isSafeInteger(amount))) {
    throw new Error('Billing summary totals exceed the safe integer range');
  }
  if (totals.subtotal !== totals.mealCost + totals.fixedCost
    || totals.mealCost + mealSummary.unallocatedFoodCost !== totals.foodCost) {
    throw new Error('Billing summary totals do not balance');
  }
  return {
    billingPeriodId: mealSummary.billingPeriodId,
    period: mealSummary.period,
    periodStatus: mealSummary.periodStatus,
    mealRate: mealSummary.mealRate,
    fixedCostPolicy: fixed.policy,
    totals,
    unbilledExpenses: { other: expenseTotals.other, asset: expenseTotals.asset },
    residents,
    warnings,
  };
};

export default { getMealRateSummary, getBillingSummary };
