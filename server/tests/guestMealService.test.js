import assert from 'node:assert/strict';
import test from 'node:test';
import { combineMealCounts } from '../services/guestMealService.js';

test('combineMealCounts reports guests separately and totals correctly', () => {
  const result = combineMealCounts(10, 5);
  assert.deepStrictEqual(result, {
    ownMealCount: 10,
    guestMealCount: 5,
    totalMealCount: 15,
  });
});

test('combineMealCounts handles zero-guest case', () => {
  const result = combineMealCounts(12, 0);
  assert.deepStrictEqual(result, {
    ownMealCount: 12,
    guestMealCount: 0,
    totalMealCount: 12,
  });
});

test('combineMealCounts handles zero-own case', () => {
  const result = combineMealCounts(0, 3);
  assert.deepStrictEqual(result, {
    ownMealCount: 0,
    guestMealCount: 3,
    totalMealCount: 3,
  });
});
