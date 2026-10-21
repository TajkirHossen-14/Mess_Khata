import { splitFixedCosts } from './fixedCostSplit.js';

const invalidInput = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

export const allocateMealCosts = ({ totalFoodCost, residents }) => {
  if (!Number.isSafeInteger(totalFoodCost) || totalFoodCost < 0) {
    throw invalidInput('totalFoodCost must be a non-negative whole number of Taka');
  }
  if (!Array.isArray(residents)) {
    throw invalidInput('residents must be an array');
  }

  for (const resident of residents) {
    if (!resident || !Number.isSafeInteger(resident.billableMeals) || resident.billableMeals < 0) {
      throw invalidInput('billableMeals must be a non-negative whole number');
    }
    if (resident.residentId == null) {
      throw invalidInput('residentId is required');
    }
  }

  const totalMeals = residents.reduce((sum, resident) => sum + resident.billableMeals, 0);
  if (!Number.isSafeInteger(totalMeals)) {
    throw invalidInput('total billableMeals exceeds the safe integer range');
  }

  const allocationsById = new Map();
  let mealRate = null;
  let unallocated = totalFoodCost;
  let warnings = ['NO_MEALS_RECORDED'];

  if (totalMeals > 0) {
    mealRate = Math.round((totalFoodCost / totalMeals) * 100) / 100;
    const eligibleResidents = residents
      .map((resident, index) => ({ resident, index }))
      .filter(({ resident }) => resident.billableMeals > 0);
    const shares = splitFixedCosts({
      total: totalFoodCost,
      residents: eligibleResidents.map(({ resident }) => ({
        id: resident.residentId,
        weight: resident.billableMeals,
      })),
    });
    eligibleResidents.forEach(({ index }, shareIndex) => {
      allocationsById.set(index, shares[shareIndex].share);
    });
    unallocated = 0;
    warnings = [];
  }

  const allocations = residents.map((resident, index) => ({
    residentId: resident.residentId,
    mealCost: allocationsById.get(index) ?? 0,
  }));
  const allocatedTotal = allocations.reduce((sum, allocation) => sum + allocation.mealCost, 0);
  if (allocatedTotal + unallocated !== totalFoodCost) {
    throw new Error('Meal cost allocation does not balance');
  }

  return { mealRate, allocations, unallocated, warnings };
};

const isWholeTaka = (value) => Number.isSafeInteger(value);

export const combineCosts = ({ mealRows, fixedShares }) => {
  if (!Array.isArray(mealRows) || !Array.isArray(fixedShares)) {
    throw invalidInput('mealRows and fixedShares must be arrays');
  }

  const rowsByResident = new Map();
  for (const meal of mealRows) {
    if (!meal || meal.residentId == null) throw invalidInput('meal row residentId is required');
    for (const field of ['ownMealCount', 'guestMealCount', 'billableMeals', 'mealCost']) {
      if (!isWholeTaka(meal[field]) || meal[field] < 0) {
        throw invalidInput(`${field} must be a non-negative whole number`);
      }
    }
    if (meal.billableMeals !== meal.ownMealCount + meal.guestMealCount) {
      throw invalidInput('billableMeals must equal ownMealCount plus guestMealCount');
    }
    const key = String(meal.residentId);
    if (rowsByResident.has(key)) throw invalidInput('mealRows contains a duplicate residentId');
    rowsByResident.set(key, {
      residentId: key,
      name: meal.name,
      ownMealCount: meal.ownMealCount,
      guestMealCount: meal.guestMealCount,
      billableMeals: meal.billableMeals,
      mealCost: meal.mealCost,
      fixedCostShare: 0,
    });
  }

  const fixedResidents = new Set();
  for (const fixed of fixedShares) {
    if (!fixed || fixed.residentId == null) throw invalidInput('fixed share residentId is required');
    if (!isWholeTaka(fixed.share) || fixed.share < 0) {
      throw invalidInput('fixed share must be a non-negative whole number');
    }
    const key = String(fixed.residentId);
    if (fixedResidents.has(key)) throw invalidInput('fixedShares contains a duplicate residentId');
    fixedResidents.add(key);
    if (!rowsByResident.has(key)) {
      rowsByResident.set(key, {
        residentId: key,
        name: fixed.name,
        ownMealCount: 0,
        guestMealCount: 0,
        billableMeals: 0,
        mealCost: 0,
        fixedCostShare: fixed.share,
      });
    } else {
      const row = rowsByResident.get(key);
      if (row.name == null) row.name = fixed.name;
      row.fixedCostShare = fixed.share;
    }
  }

  const rows = [...rowsByResident.values()].map((row) => ({
    ...row,
    subtotal: row.mealCost + row.fixedCostShare,
  }));
  const totals = rows.reduce((sum, row) => ({
    mealCost: sum.mealCost + row.mealCost,
    fixedCost: sum.fixedCost + row.fixedCostShare,
    subtotal: sum.subtotal + row.subtotal,
  }), { mealCost: 0, fixedCost: 0, subtotal: 0 });
  if (Object.values(totals).some((amount) => !isWholeTaka(amount))) {
    throw new Error('Combined billing totals exceed the safe integer range');
  }
  if (totals.subtotal !== totals.mealCost + totals.fixedCost) {
    throw new Error('Combined billing totals do not balance');
  }
  return { rows, totals };
};

export const computeBalance = ({ subtotal, adjustments, payments }) => {
  if (!isWholeTaka(subtotal) || subtotal < 0) {
    throw invalidInput('subtotal must be a non-negative whole number');
  }
  if (!Array.isArray(adjustments) || !Array.isArray(payments)) {
    throw invalidInput('adjustments and payments must be arrays');
  }
  let adjustmentsNet = 0;
  for (const adjustment of adjustments) {
    if (!isWholeTaka(adjustment?.amount)) throw invalidInput('adjustment amounts must be whole numbers');
    if (!adjustment.voidedAt) adjustmentsNet += adjustment.amount;
  }
  let confirmedPayments = 0;
  let pendingPayments = 0;
  for (const payment of payments) {
    if (!payment || !isWholeTaka(payment.amount) || payment.amount < 0) {
      throw invalidInput('payment amounts must be non-negative whole numbers');
    }
    if (payment.status === 'confirmed') confirmedPayments += payment.amount;
    if (payment.status === 'pending') pendingPayments += payment.amount;
  }
  const outstanding = subtotal + adjustmentsNet - confirmedPayments;
  if (![adjustmentsNet, confirmedPayments, pendingPayments, outstanding].every(isWholeTaka)) {
    throw new Error('Balance calculation exceeds the safe integer range');
  }
  const balanceStatus = outstanding > 0 ? 'due' : outstanding === 0 ? 'settled' : 'credit';
  return { adjustmentsNet, confirmedPayments, pendingPayments, outstanding, balanceStatus };
};

export default { allocateMealCosts, combineCosts, computeBalance };
