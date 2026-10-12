import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateFixedCostSplit, SUPPORTED_POLICY_MODES } from '../utils/fixedCostSplit.js';

const makeResidents = (count) => Array.from({ length: count }, (_, index) => `res-${index + 1}`);

const sumAmounts = (entries) => entries.reduce((total, entry) => total + entry.amount, 0);

test('equal allocation divides evenly when total divides exactly', () => {
  const residents = makeResidents(4);
  const result = calculateFixedCostSplit({ totalCost: 1200, residentIds: residents, mode: 'equal' });

  assert.deepEqual(result, [
    { residentId: 'res-1', amount: 300 },
    { residentId: 'res-2', amount: 300 },
    { residentId: 'res-3', amount: 300 },
    { residentId: 'res-4', amount: 300 },
  ]);
});

test('equal allocation distributes the remainder by largest remainder method', () => {
  const residents = makeResidents(3);
  const result = calculateFixedCostSplit({ totalCost: 1000, residentIds: residents, mode: 'equal' });

  assert.deepEqual(result, [
    { residentId: 'res-1', amount: 334 },
    { residentId: 'res-2', amount: 333 },
    { residentId: 'res-3', amount: 333 },
  ]);
});

test('per-seat allocation respects unequal seat counts', () => {
  const residents = ['a', 'b', 'c'];
  const result = calculateFixedCostSplit({
    totalCost: 1000,
    residentIds: residents,
    mode: 'per_seat',
    seatCounts: { a: 1, b: 2, c: 3 },
  });

  assert.deepEqual(result, [
    { residentId: 'a', amount: 167 },
    { residentId: 'b', amount: 333 },
    { residentId: 'c', amount: 500 },
  ]);
});

test('custom percentage allocation matches exact percentages', () => {
  const residents = ['a', 'b', 'c'];
  const result = calculateFixedCostSplit({
    totalCost: 1000,
    residentIds: residents,
    mode: 'custom',
    customPercentages: { a: 50, b: 30, c: 20 },
  });

  assert.deepEqual(result, [
    { residentId: 'a', amount: 500 },
    { residentId: 'b', amount: 300 },
    { residentId: 'c', amount: 200 },
  ]);
});

test('custom percentages summing to exactly 100% are accepted', () => {
  const residents = makeResidents(4);
  const result = calculateFixedCostSplit({
    totalCost: 2500,
    residentIds: residents,
    mode: 'custom',
    customPercentages: {
      'res-1': 25,
      'res-2': 25,
      'res-3': 25,
      'res-4': 25,
    },
  });

  assert.equal(sumAmounts(result), 2500);
  assert.deepEqual(result.map((entry) => entry.amount), [625, 625, 625, 625]);
});

test('percentages that do not total 100% are rejected', () => {
  assert.throws(() => {
    calculateFixedCostSplit({
      totalCost: 1000,
      residentIds: ['a', 'b'],
      mode: 'custom',
      customPercentages: { a: 60, b: 30 },
    });
  }, /100%/);
});

test('duplicate, missing, or unexpected custom resident IDs are rejected', () => {
  assert.throws(() => calculateFixedCostSplit({ totalCost: 1000, residentIds: ['a', 'a'], mode: 'equal' }), /duplicate|Resident/i);
  assert.throws(() => calculateFixedCostSplit({ totalCost: 1000, residentIds: ['a', 'b'], mode: 'custom', customPercentages: { a: 50 } }), /missing/i);
  assert.throws(() => calculateFixedCostSplit({ totalCost: 1000, residentIds: ['a', 'b'], mode: 'custom', customPercentages: { a: 50, b: 25, c: 25 } }), /missing|unexpected/i);
});

test('tie-breaking uses ascending resident ID order deterministically', () => {
  const result = calculateFixedCostSplit({
    totalCost: 1,
    residentIds: ['b', 'A', 'a'],
    mode: 'equal',
  });

  assert.deepEqual(result, [
    { residentId: 'b', amount: 0 },
    { residentId: 'A', amount: 1 },
    { residentId: 'a', amount: 0 },
  ]);
});

test('output preserves the original input order', () => {
  const residents = ['z', 'a', 'm'];
  const result = calculateFixedCostSplit({ totalCost: 10, residentIds: residents, mode: 'equal' });
  assert.deepEqual(result.map((entry) => entry.residentId), ['z', 'a', 'm']);
});

test('total conservation is exact for all allocations', () => {
  const result = calculateFixedCostSplit({
    totalCost: 101,
    residentIds: ['a', 'b', 'c'],
    mode: 'equal',
  });

  assert.equal(sumAmounts(result), 101);
});

test('zero total cost returns zero shares without error', () => {
  const result = calculateFixedCostSplit({ totalCost: 0, residentIds: ['a', 'b'], mode: 'equal' });
  assert.deepEqual(result, [
    { residentId: 'a', amount: 0 },
    { residentId: 'b', amount: 0 },
  ]);
});

test('empty or invalid inputs fail safely', () => {
  assert.throws(() => calculateFixedCostSplit({ totalCost: 10, residentIds: [], mode: 'equal' }), /zero|required|resident/i);
  assert.throws(() => calculateFixedCostSplit({ totalCost: Number.MAX_SAFE_INTEGER + 1, residentIds: ['a'], mode: 'equal' }), /safe integer/i);
  assert.throws(() => calculateFixedCostSplit({ totalCost: 10, residentIds: ['a'], mode: 'unsupported' }), /Unsupported/i);
});

test('repeated runs produce identical results', () => {
  const residents = ['a', 'b', 'c', 'd'];
  const first = calculateFixedCostSplit({ totalCost: 1234, residentIds: residents, mode: 'per_seat', seatCounts: { a: 1, b: 2, c: 3, d: 4 } });
  const second = calculateFixedCostSplit({ totalCost: 1234, residentIds: residents, mode: 'per_seat', seatCounts: { a: 1, b: 2, c: 3, d: 4 } });

  assert.deepEqual(first, second);
});

test('supported policy modes are exposed and valid', () => {
  assert.deepEqual(SUPPORTED_POLICY_MODES, ['equal', 'per_seat', 'custom']);
});
