import Adjustment from "../models/Adjustment.js";
import Payment from "../models/Payment.js";
import { getPeriodForMess } from "./billingPeriodService.js";
import { computeMealRecords } from "./mealRecordService.js";
import { sumExpensesByCategory } from "./expenseTotalsService.js";
import { getFixedCostShares } from "./fixedCostShareService.js";
import {
  allocateMealCosts,
  combineCosts,
  computeBalance,
} from "../utils/billingMath.js";
import { todayDhaka, calendarDateString } from "../utils/dateTime.js";
import HttpError from "../utils/HttpError.js";
function status(period, now) {
  const today = todayDhaka(now);
  const start = calendarDateString(period.startDate);
  const end = calendarDateString(period.endDate);
  return today < start ? "upcoming" : today > end ? "ended" : "in_progress";
}
export async function getMealRateSummary(
  messId,
  billingPeriodId,
  now = new Date(),
) {
  const period = await getPeriodForMess(messId, billingPeriodId);
  const { records, messTotals } = await computeMealRecords(
    messId,
    billingPeriodId,
  );
  for (const r of records)
    if (r.totalMealCount !== r.ownMealCount + r.guestMealCount)
      throw new HttpError(500, "Meal record is inconsistent");
  const totals = await sumExpensesByCategory(billingPeriodId);
  const allocation = allocateMealCosts({
    totalFoodCost: totals.grocery,
    residents: records.map((r) => ({
      residentId: r.residentId,
      billableMeals: r.totalMealCount,
    })),
  });
  const costs = new Map(
    allocation.allocations.map((r) => [r.residentId.toString(), r.mealCost]),
  );
  const periodStatus = status(period, now);
  const warnings = [...allocation.warnings];
  if (periodStatus !== "ended") warnings.push("PERIOD_NOT_ENDED");
  return {
    billingPeriodId,
    period: {
      startDate: calendarDateString(period.startDate),
      endDate: calendarDateString(period.endDate),
    },
    periodStatus,
    totalFoodCost: totals.grocery,
    totalMeals: {
      own: messTotals.ownMealCount,
      guest: messTotals.guestMealCount,
      billable: messTotals.totalMealCount,
    },
    mealRate: allocation.mealRate,
    residents: records.map((r) => ({
      residentId: r.residentId,
      name: r.name,
      ownMealCount: r.ownMealCount,
      guestMealCount: r.guestMealCount,
      billableMeals: r.totalMealCount,
      mealCost: costs.get(r.residentId.toString()) || 0,
    })),
    totalMealCost: allocation.allocations.reduce((s, r) => s + r.mealCost, 0),
    unallocatedFoodCost: allocation.unallocated,
    warnings,
  };
}
export async function getBillingSummary(
  messId,
  billingPeriodId,
  now = new Date(),
) {
  const meal = await getMealRateSummary(messId, billingPeriodId, now);
  const fixed = await getFixedCostShares(messId, billingPeriodId);
  const expenseTotals = await sumExpensesByCategory(billingPeriodId);
  if (
    fixed.total !== expenseTotals.fixed + expenseTotals.utility ||
    fixed.shares.reduce((s, r) => s + r.share, 0) !== fixed.total
  )
    throw new HttpError(500, "Fixed-cost total is inconsistent");
  const combined = combineCosts({
    mealRows: meal.residents,
    fixedShares: fixed.shares,
  });
  const adjustments = await Adjustment.find({
    billingPeriodId,
    voidedAt: null,
  }).lean();
  const payments = await Payment.find({ billingPeriodId }).lean();
  const byAdj = new Map();
  const byPay = new Map();
  for (const row of adjustments) {
    const key = row.residentId.toString();
    if (!byAdj.has(key)) byAdj.set(key, []);
    byAdj.get(key).push(row);
  }
  for (const row of payments) {
    const key = row.residentId.toString();
    if (!byPay.has(key)) byPay.set(key, []);
    byPay.get(key).push(row);
  }
  const residentIds = new Set(
    combined.rows.map((r) => r.residentId.toString()),
  );
  const warnings = [...meal.warnings];
  if (expenseTotals.other > 0) warnings.push("OTHER_EXPENSES_NOT_BILLED");
  if ([...byAdj.keys(), ...byPay.keys()].some((id) => !residentIds.has(id)))
    warnings.push("UNMATCHED_ADJUSTMENTS_OR_PAYMENTS");
  const rows = combined.rows.map((row) => ({
    ...row,
    ...computeBalance({
      subtotal: row.subtotal,
      adjustments: byAdj.get(row.residentId.toString()) || [],
      payments: byPay.get(row.residentId.toString()) || [],
    }),
  }));
  const totals = rows.reduce(
    (sum, r) => ({
      foodCost: meal.totalFoodCost,
      mealCost: sum.mealCost + r.mealCost,
      unallocatedFoodCost: meal.unallocatedFoodCost,
      fixedCost: sum.fixedCost + r.fixedCostShare,
      subtotal: sum.subtotal + r.subtotal,
      adjustmentsNet: sum.adjustmentsNet + r.adjustmentsNet,
      confirmedPayments: sum.confirmedPayments + r.confirmedPayments,
      pendingPayments: sum.pendingPayments + r.pendingPayments,
      outstanding: sum.outstanding + r.outstanding,
    }),
    {
      foodCost: meal.totalFoodCost,
      mealCost: 0,
      unallocatedFoodCost: meal.unallocatedFoodCost,
      fixedCost: 0,
      subtotal: 0,
      adjustmentsNet: 0,
      confirmedPayments: 0,
      pendingPayments: 0,
      outstanding: 0,
    },
  );
  return {
    billingPeriodId,
    period: meal.period,
    periodStatus: meal.periodStatus,
    mealRate: meal.mealRate,
    fixedCostPolicy: fixed.policy,
    totals,
    unbilledExpenses: {
      other: expenseTotals.other,
      asset: expenseTotals.asset,
    },
    residents: rows,
    warnings,
  };
}
