import { splitFixedCosts } from "./fixedCostSplit.js";
import HttpError from "./HttpError.js";
function integer(value, label, nonNegative = true) {
  if (!Number.isSafeInteger(value) || (nonNegative ? value < 0 : false))
    throw new HttpError(
      400,
      `${label} must be a ${nonNegative ? "non-negative " : ""}whole number`,
    );
}
export function allocateMealCosts({ totalFoodCost, residents }) {
  integer(totalFoodCost, "Food cost");
  if (!Array.isArray(residents))
    throw new HttpError(400, "Residents must be an array");
  residents.forEach((r) => integer(r.billableMeals, "Meal count"));
  const totalMeals = residents.reduce((sum, r) => sum + r.billableMeals, 0);
  if (totalMeals === 0)
    return {
      mealRate: null,
      allocations: residents.map((r) => ({
        residentId: r.residentId,
        mealCost: 0,
      })),
      unallocated: totalFoodCost,
      warnings: ["NO_MEALS_RECORDED"],
    };
  const mealRate = Math.round((totalFoodCost / totalMeals) * 100) / 100;
  const positive = residents
    .filter((r) => r.billableMeals > 0)
    .map((r) => ({ id: r.residentId, weight: r.billableMeals }));
  const allocated = splitFixedCosts({
    total: totalFoodCost,
    residents: positive,
  });
  const byId = new Map(
    allocated.map((r) => [r.residentId.toString(), r.share]),
  );
  const allocations = residents.map((r) => ({
    residentId: r.residentId,
    mealCost: byId.get(r.residentId.toString()) || 0,
  }));
  if (allocations.reduce((sum, r) => sum + r.mealCost, 0) !== totalFoodCost)
    throw new HttpError(500, "Meal-cost allocation is unbalanced");
  return { mealRate, allocations, unallocated: 0, warnings: [] };
}
export function combineCosts({ mealRows, fixedShares }) {
  if (!Array.isArray(mealRows) || !Array.isArray(fixedShares))
    throw new HttpError(400, "Cost rows must be arrays");
  const fixed = new Map(fixedShares.map((r) => [r.residentId.toString(), r]));
  const seen = new Set();
  const rows = [];
  for (const meal of [...mealRows, ...fixedShares]) {
    const id = meal.residentId.toString();
    if (seen.has(id)) continue;
    seen.add(id);
    const f = fixed.get(id);
    const m = mealRows.find((r) => r.residentId.toString() === id);
    const mealCost = m?.mealCost ?? 0;
    const fixedCostShare = f?.share ?? 0;
    [mealCost, fixedCostShare].forEach((v) => integer(v, "Cost"));
    rows.push({
      residentId: meal.residentId,
      name: m?.name || f?.name || "",
      ownMealCount: m?.ownMealCount || 0,
      guestMealCount: m?.guestMealCount || 0,
      billableMeals: m?.billableMeals || 0,
      mealCost,
      fixedCostShare,
      subtotal: mealCost + fixedCostShare,
    });
  }
  const totals = rows.reduce(
    (a, r) => ({
      mealCost: a.mealCost + r.mealCost,
      fixedCost: a.fixedCost + r.fixedCostShare,
      subtotal: a.subtotal + r.subtotal,
    }),
    { mealCost: 0, fixedCost: 0, subtotal: 0 },
  );
  return { rows, totals };
}
export function computeBalance({ subtotal, adjustments = [], payments = [] }) {
  integer(subtotal, "Subtotal");
  let adjustmentsNet = 0;
  for (const row of adjustments) {
    integer(Math.abs(row.amount), "Adjustment");
    if (!row.voidedAt) adjustmentsNet += row.amount;
  }
  let confirmedPayments = 0;
  let pendingPayments = 0;
  for (const row of payments) {
    integer(row.amount, "Payment");
    if (row.status === "confirmed") confirmedPayments += row.amount;
    else if (row.status === "pending") pendingPayments += row.amount;
  }
  const outstanding = subtotal + adjustmentsNet - confirmedPayments;
  return {
    adjustmentsNet,
    confirmedPayments,
    pendingPayments,
    outstanding,
    balanceStatus:
      outstanding > 0 ? "due" : outstanding === 0 ? "settled" : "credit",
  };
}
export function buildBillSnapshot({ row, adjustments = [], fixedCostPolicy, mealRate }) {
  const lines = adjustments.map((a) => ({ adjustmentId: a._id || a.adjustmentId, amount: a.amount, reason: a.reason }));
  const adjustmentsNet = lines.reduce((sum, a) => { integer(a.amount, 'Adjustment', false); return sum + a.amount; }, 0);
  if (row.adjustmentsNet != null && row.adjustmentsNet !== adjustmentsNet) throw new HttpError(400, 'Adjustment lines do not equal adjustmentsNet');
  ['mealCost', 'fixedCostShare'].forEach((key) => integer(row[key] || 0, key));
  return { mealRate: mealRate ?? null, ownMealCount: row.ownMealCount || 0, guestMealCount: row.guestMealCount || 0, billableMeals: row.billableMeals || 0, mealCost: row.mealCost || 0, fixedCostShare: row.fixedCostShare || 0, fixedCostPolicy, adjustments: lines, adjustmentsNet, totalDue: (row.mealCost || 0) + (row.fixedCostShare || 0) + adjustmentsNet };
}
export function getBillPaymentStatus({ outstanding, confirmedPayments }) { return outstanding > 0 ? (confirmedPayments ? 'partial' : 'unpaid') : outstanding === 0 ? 'paid' : 'credit'; }
export function evaluateBillingReadiness({ periodStatus, hasIssuedBills, residentCount, unallocatedFoodCost, warnings = [] }) { const blocking = []; const needsAcknowledgement = []; const add = (list, code, message) => list.push({ code, message }); if (periodStatus !== 'ended') add(blocking, 'PERIOD_NOT_ENDED', 'The billing period has not ended yet.'); if (hasIssuedBills) add(blocking, 'BILLS_ALREADY_GENERATED', 'Bills are already generated for this period.'); if (!residentCount) add(blocking, 'NO_RESIDENTS', 'No residents are eligible for this period.'); if (unallocatedFoodCost > 0) add(blocking, 'UNALLOCATED_FOOD_COST', 'Food costs cannot be allocated because no meals were recorded.'); if (warnings.includes('UNMATCHED_ADJUSTMENTS_OR_PAYMENTS')) add(blocking, 'UNMATCHED_ADJUSTMENTS_OR_PAYMENTS', 'There are unmatched adjustments or payments.'); if (warnings.includes('OTHER_EXPENSES_NOT_BILLED')) add(needsAcknowledgement, 'OTHER_EXPENSES_NOT_BILLED', 'Other expenses are not included in bills.'); if (warnings.includes('NO_MEALS_RECORDED')) add(needsAcknowledgement, 'NO_MEALS_RECORDED', 'No meals were recorded.'); return { canGenerate: !blocking.length, blocking, needsAcknowledgement }; }
