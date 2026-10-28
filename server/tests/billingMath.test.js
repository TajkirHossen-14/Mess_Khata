import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { allocateMealCosts, combineCosts, computeBalance, buildBillSnapshot, getBillPaymentStatus, evaluateBillingReadiness } from '../utils/billingMath.js';

describe('allocateMealCosts', () => {
  it('allocates exact whole-Taka costs with display-only rate', () => {
    assert.deepEqual(allocateMealCosts({ totalFoodCost: 1000, residents: [{ residentId: 'a', billableMeals: 1 }, { residentId: 'b', billableMeals: 1 }, { residentId: 'c', billableMeals: 1 }] }), { mealRate: 333.33, allocations: [{ residentId: 'a', mealCost: 334 }, { residentId: 'b', mealCost: 333 }, { residentId: 'c', mealCost: 333 }], unallocated: 0, warnings: [] });
    assert.deepEqual(allocateMealCosts({ totalFoodCost: 100, residents: [{ residentId: 'a', billableMeals: 1 }, { residentId: 'b', billableMeals: 2 }] }).allocations.map((r) => r.mealCost), [33, 67]);
  });
  it('keeps zero-meal residents and unallocated food visible', () => {
    assert.deepEqual(allocateMealCosts({ totalFoodCost: 500, residents: [{ residentId: 'a', billableMeals: 0 }, { residentId: 'b', billableMeals: 0 }] }), { mealRate: null, allocations: [{ residentId: 'a', mealCost: 0 }, { residentId: 'b', mealCost: 0 }], unallocated: 500, warnings: ['NO_MEALS_RECORDED'] });
  });
  it('rejects fractional or negative inputs', () => {
    assert.throws(() => allocateMealCosts({ totalFoodCost: 1.5, residents: [] }), { statusCode: 400 });
    assert.throws(() => allocateMealCosts({ totalFoodCost: 2, residents: [{ residentId: 'a', billableMeals: -1 }] }), { statusCode: 400 });
  });
});

describe('combineCosts', () => {
  it('unions meal and fixed rows and balances totals', () => {
    const result = combineCosts({ mealRows: [{ residentId: 'a', name: 'A', ownMealCount: 4, guestMealCount: 1, billableMeals: 5, mealCost: 4000 }], fixedShares: [{ residentId: 'a', name: 'A', share: 1000 }, { residentId: 'b', name: 'B', share: 1000 }] });
    assert.deepEqual(result.totals, { mealCost: 4000, fixedCost: 2000, subtotal: 6000 });
    assert.equal(result.rows[1].subtotal, 1000);
  });
});

describe('computeBalance', () => {
  it('deducts only confirmed payments', () => {
    assert.deepEqual(computeBalance({ subtotal: 5000, adjustments: [{ amount: 300 }, { amount: -100 }], payments: [{ amount: 2000, status: 'confirmed' }, { amount: 1000, status: 'pending' }, { amount: 500, status: 'rejected' }] }), { adjustmentsNet: 200, confirmedPayments: 2000, pendingPayments: 1000, outstanding: 3200, balanceStatus: 'due' });
    assert.equal(computeBalance({ subtotal: 4000, adjustments: [{ amount: -200 }], payments: [{ amount: 4000, status: 'confirmed' }]}).balanceStatus, 'credit');
    assert.equal(computeBalance({ subtotal: 100, adjustments: [{ amount: 200, voidedAt: new Date() }] }).adjustmentsNet, 0);
  });
});

describe('final bill helpers', () => {
  it('creates frozen totals and rejects mismatched adjustment lines', () => {
    const a = buildBillSnapshot({ row: { mealCost: 4000, fixedCostShare: 1000, adjustmentsNet: 300 }, adjustments: [{ amount: 300, reason: 'broken cup' }], fixedCostPolicy: 'equal', mealRate: 100 });
    const b = buildBillSnapshot({ row: { mealCost: 3000, fixedCostShare: 1000, adjustmentsNet: -200 }, adjustments: [{ amount: -200, reason: 'credit' }], fixedCostPolicy: 'equal', mealRate: 100 });
    const c = buildBillSnapshot({ row: { mealCost: 3000, fixedCostShare: 1000 }, adjustments: [], fixedCostPolicy: 'equal', mealRate: 100 });
    assert.deepEqual([a.totalDue, b.totalDue, c.totalDue], [5300, 3800, 4000]);
    assert.equal(a.totalDue + b.totalDue + c.totalDue, 13100);
    assert.throws(() => buildBillSnapshot({ row: { mealCost: 1, fixedCostShare: 0, adjustmentsNet: 2 }, adjustments: [{ amount: 1, reason: 'x' }] }), { statusCode: 400 });
  });
  it('classifies payment state and readiness', () => {
    assert.equal(getBillPaymentStatus({ outstanding: 5300, confirmedPayments: 0 }), 'unpaid'); assert.equal(getBillPaymentStatus({ outstanding: 3300, confirmedPayments: 2000 }), 'partial'); assert.equal(getBillPaymentStatus({ outstanding: 0, confirmedPayments: 1 }), 'paid'); assert.equal(getBillPaymentStatus({ outstanding: -200, confirmedPayments: 1 }), 'credit');
    assert.equal(evaluateBillingReadiness({ periodStatus: 'ended', hasIssuedBills: false, residentCount: 1, unallocatedFoodCost: 0 }).canGenerate, true);
    assert.equal(evaluateBillingReadiness({ periodStatus: 'in_progress', hasIssuedBills: false, residentCount: 1, unallocatedFoodCost: 0 }).blocking[0].code, 'PERIOD_NOT_ENDED');
  });
});
