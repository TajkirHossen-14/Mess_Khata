import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import BillingPeriod from '../models/BillingPeriod.js';
import Manager from '../models/Manager.js';
import Payment from '../models/Payment.js';
import Resident from '../models/Resident.js';
import paymentRoutes from '../routes/paymentRoutes.js';
import { signToken } from '../utils/jwt.js';
import { allocateMealCosts, computeBalance } from '../utils/billingMath.js';

const ids = {
  messId: '64b100000000000000000001',
  foreignMessId: '64b100000000000000000002',
  managerUserId: '64b100000000000000000003',
  managerId: '64b100000000000000000004',
  secondManagerUserId: '64b100000000000000000005',
  secondManagerId: '64b100000000000000000006',
  residentUserId: '64b100000000000000000007',
  residentId: '64b100000000000000000008',
  selfResidentId: '64b100000000000000000009',
  periodId: '64b100000000000000000010',
  foreignPeriodId: '64b100000000000000000011',
  paymentId: '64b100000000000000000012',
  selfPaymentId: '64b100000000000000000013',
  foreignPaymentId: '64b100000000000000000014',
  foreignResidentId: '64b100000000000000000015',
};

const baseFixtures = () => ({
  managers: [
    { _id: ids.managerId, userId: ids.managerUserId, messId: ids.messId },
    { _id: ids.secondManagerId, userId: ids.secondManagerUserId, messId: ids.messId },
  ],
  residents: [
    { _id: ids.residentId, userId: ids.residentUserId, messId: ids.messId },
    { _id: ids.selfResidentId, userId: ids.managerUserId, messId: ids.messId },
    { _id: ids.foreignResidentId, userId: ids.residentUserId, messId: ids.foreignMessId },
  ],
  periods: [
    { _id: ids.periodId, messId: ids.messId },
    { _id: ids.foreignPeriodId, messId: ids.foreignMessId },
  ],
  payments: [
    { _id: ids.paymentId, billingPeriodId: ids.periodId, residentId: ids.residentId, amount: 2500, status: 'pending' },
    { _id: ids.selfPaymentId, billingPeriodId: ids.periodId, residentId: ids.selfResidentId, amount: 750, status: 'pending' },
    { _id: ids.foreignPaymentId, billingPeriodId: ids.foreignPeriodId, residentId: ids.foreignResidentId, amount: 900, status: 'pending' },
  ],
});

const withReviewRoute = async (run, overrides = {}) => {
  const originals = {
    findManager: Manager.findOne,
    countManagers: Manager.countDocuments,
    findPayment: Payment.findById,
    updatePayment: Payment.findOneAndUpdate,
    findPeriod: BillingPeriod.findOne,
    findResident: Resident.findOne,
    jwtSecret: process.env.JWT_SECRET,
  };
  const fixtures = { ...baseFixtures(), ...overrides };
  const queries = { managers: [], managerCounts: [], periods: [], residents: [], transitions: [] };

  Manager.findOne = (filter) => {
    queries.managers.push(filter);
    return {
      select: async () => fixtures.managers.find((manager) =>
        String(manager.userId) === String(filter.userId)
        && String(manager.messId) === String(filter.messId)) ?? null,
    };
  };
  Manager.countDocuments = async (filter) => {
    queries.managerCounts.push(filter);
    return fixtures.managers.filter((manager) => String(manager.messId) === String(filter.messId)).length;
  };
  Payment.findById = async (id) => fixtures.payments.find((payment) => String(payment._id) === String(id)) ?? null;
  Payment.findOneAndUpdate = async (filter, update, options) => {
    queries.transitions.push({ filter, update, options });
    const payment = fixtures.payments.find((item) =>
      String(item._id) === String(filter._id) && item.status === filter.status);
    if (!payment) return null;
    Object.assign(payment, update.$set);
    return { ...payment };
  };
  BillingPeriod.findOne = (filter) => {
    queries.periods.push(filter);
    return {
      select: async () => fixtures.periods.find((period) =>
        String(period._id) === String(filter._id)
        && String(period.messId) === String(filter.messId)) ?? null,
    };
  };
  Resident.findOne = (filter) => {
    queries.residents.push(filter);
    return {
      select: async () => fixtures.residents.find((resident) =>
        String(resident._id) === String(filter._id)
        && String(resident.messId) === String(filter.messId)) ?? null,
    };
  };

  process.env.JWT_SECRET = 'payment-review-test-secret';
  const app = express();
  app.use(express.json());
  app.use('/api/payments', paymentRoutes);
  const server = app.listen(0, '127.0.0.1');

  try {
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    const address = server.address();
    const request = async ({ token, path, body } = {}) => {
      const headers = { 'content-type': 'application/json', connection: 'close' };
      if (token) headers.authorization = `Bearer ${token}`;
      const response = await fetch(`http://127.0.0.1:${address.port}${path ?? `/api/payments/${ids.paymentId}/confirm`}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body ?? {}),
      });
      return { status: response.status, body: await response.json() };
    };
    const tokenFor = (roles, { userId = ids.managerUserId, messId = ids.messId } = {}) => signToken({
      id: userId,
      messId,
      roles,
    });
    await run({ request, tokenFor, fixtures, queries });
  } finally {
    await new Promise((resolve) => server.close(resolve));
    Manager.findOne = originals.findManager;
    Manager.countDocuments = originals.countManagers;
    Payment.findById = originals.findPayment;
    Payment.findOneAndUpdate = originals.updatePayment;
    BillingPeriod.findOne = originals.findPeriod;
    Resident.findOne = originals.findResident;
    if (originals.jwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originals.jwtSecret;
  }
};

test('confirmation updates pending status, audit fields, and calculated outstanding due', async () => {
  await withReviewRoute(async ({ request, tokenFor, fixtures }) => {
    const before = computeBalance({ subtotal: 5000, adjustments: [], payments: fixtures.payments });
    const result = await request({ token: tokenFor(['manager']) });

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
    assert.equal(result.body.data.status, 'confirmed');
    assert.equal(String(result.body.data.reviewedBy), ids.managerId);
    assert.ok(result.body.data.reviewedAt);

    const after = computeBalance({ subtotal: 5000, adjustments: [], payments: fixtures.payments });
    assert.equal(after.confirmedPayments, before.confirmedPayments + 2500);
    assert.equal(after.outstanding, before.outstanding - 2500);
  });
});

test('rejection records audit fields and leaves calculated outstanding due unchanged', async () => {
  await withReviewRoute(async ({ request, tokenFor, fixtures }) => {
    const before = computeBalance({ subtotal: 5000, adjustments: [], payments: fixtures.payments });
    const result = await request({
      token: tokenFor(['manager']),
      path: `/api/payments/${ids.paymentId}/reject`,
    });

    assert.equal(result.status, 200);
    assert.equal(result.body.data.status, 'rejected');
    assert.equal(String(result.body.data.reviewedBy), ids.managerId);
    assert.ok(result.body.data.reviewedAt);

    const after = computeBalance({ subtotal: 5000, adjustments: [], payments: fixtures.payments });
    assert.equal(after.confirmedPayments, before.confirmedPayments);
    assert.equal(after.outstanding, before.outstanding);
  });
});

test('duplicate and competing review requests transition a payment only once', async () => {
  await withReviewRoute(async ({ request, tokenFor, fixtures, queries }) => {
    const token = tokenFor(['manager']);
    const first = await request({ token });
    const duplicate = await request({ token });
    assert.equal(first.status, 200);
    assert.equal(duplicate.status, 409);

    fixtures.payments.find((payment) => payment._id === ids.paymentId).status = 'pending';
    fixtures.payments.find((payment) => payment._id === ids.paymentId).reviewedBy = null;
    fixtures.payments.find((payment) => payment._id === ids.paymentId).reviewedAt = null;
    const competing = await Promise.all([
      request({ token, path: `/api/payments/${ids.paymentId}/confirm` }),
      request({ token, path: `/api/payments/${ids.paymentId}/reject` }),
    ]);
    assert.deepEqual(competing.map(({ status }) => status).sort(), [200, 409]);
    assert.equal(queries.transitions.every(({ filter }) => filter.status === 'pending'), true);
    assert.equal(queries.transitions.every(({ filter }) =>
      String(filter.billingPeriodId) === ids.periodId
      && String(filter.residentId) === ids.residentId), true);
    assert.ok(['confirmed', 'rejected'].includes(fixtures.payments.find((payment) => payment._id === ids.paymentId).status));
  });
});

test('self-verification is blocked when multiple managers exist in the mess', async () => {
  await withReviewRoute(async ({ request, tokenFor, queries, fixtures }) => {
    const result = await request({
      token: tokenFor(['manager']),
      path: `/api/payments/${ids.selfPaymentId}/confirm`,
    });
    assert.equal(result.status, 403);
    assert.equal(fixtures.payments.find((payment) => payment._id === ids.selfPaymentId).status, 'pending');
    assert.deepEqual(queries.managerCounts[0], { messId: ids.messId });
  });
});

test('self-review is allowed when the mess has exactly one manager', async () => {
  const fixtures = baseFixtures();
  fixtures.managers = [fixtures.managers[0]];
  await withReviewRoute(async ({ request, tokenFor, fixtures: seeded }) => {
    const result = await request({
      token: tokenFor(['manager']),
      path: `/api/payments/${ids.selfPaymentId}/confirm`,
    });
    assert.equal(result.status, 200);
    assert.equal(result.body.data.status, 'confirmed');
    assert.equal(String(result.body.data.reviewedBy), ids.managerId);
    assert.equal(seeded.payments.find((payment) => payment._id === ids.selfPaymentId).status, 'confirmed');
  }, fixtures);
});

test('review route rejects missing authentication and non-manager roles', async () => {
  await withReviewRoute(async ({ request, tokenFor, fixtures }) => {
    const unauthenticated = await request();
    const wrongRole = await request({ token: tokenFor(['resident']) });
    assert.equal(unauthenticated.status, 401);
    assert.equal(wrongRole.status, 403);
    assert.equal(fixtures.payments.find((payment) => payment._id === ids.paymentId).status, 'pending');
  });
});

test('review route requires a Manager record matching the authenticated user and mess', async () => {
  const fixtures = baseFixtures();
  fixtures.managers = [];
  await withReviewRoute(async ({ request, tokenFor, queries, fixtures: seeded }) => {
    const result = await request({ token: tokenFor(['manager']) });
    assert.equal(result.status, 403);
    assert.deepEqual(queries.managers[0], { userId: ids.managerUserId, messId: ids.messId });
    assert.equal(seeded.payments.find((payment) => payment._id === ids.paymentId).status, 'pending');
  }, fixtures);
});

test('review route rejects payments whose billing period or resident belongs to another mess', async () => {
  await withReviewRoute(async ({ request, tokenFor, fixtures, queries }) => {
    const nonexistent = await request({
      token: tokenFor(['manager']),
      path: '/api/payments/64b100000000000000000017/confirm',
    });
    const foreignPeriod = await request({
      token: tokenFor(['manager']),
      path: `/api/payments/${ids.foreignPaymentId}/confirm`,
    });
    assert.deepEqual(nonexistent, {
      status: 404,
      body: { success: false, message: 'Payment not found' },
    });
    assert.equal(foreignPeriod.status, 404);
    assert.deepEqual(foreignPeriod.body, nonexistent.body);

    const inconsistentResidentPayment = {
      _id: '64b100000000000000000016',
      billingPeriodId: ids.periodId,
      residentId: ids.foreignResidentId,
      amount: 300,
      status: 'pending',
    };
    fixtures.payments.push(inconsistentResidentPayment);
    const foreignResident = await request({
      token: tokenFor(['manager']),
      path: `/api/payments/${inconsistentResidentPayment._id}/confirm`,
    });
    assert.equal(foreignResident.status, 404);
    assert.deepEqual(foreignResident.body, nonexistent.body);
    assert.equal(queries.periods.every((filter) => String(filter.messId) === ids.messId), true);
    assert.equal(queries.residents.every((filter) => String(filter.messId) === ids.messId), true);
    assert.equal(inconsistentResidentPayment.status, 'pending');
  });
});

test('billing balance counts confirmed payments once and ignores pending or rejected amounts', () => {
  const mealAllocation = allocateMealCosts({
    totalFoodCost: 10,
    residents: [
      { residentId: ids.residentId, billableMeals: 1 },
      { residentId: ids.foreignResidentId, billableMeals: 1 },
    ],
  });
  const foodSplit = computeBalance({ subtotal: 10000, adjustments: [], payments: [] });
  const pending = computeBalance({
    subtotal: 10000,
    adjustments: [],
    payments: [{ amount: 1200, status: 'pending' }],
  });
  const confirmed = computeBalance({
    subtotal: 10000,
    adjustments: [],
    payments: [{ amount: 1200, status: 'confirmed' }],
  });
  const rejected = computeBalance({
    subtotal: 10000,
    adjustments: [],
    payments: [{ amount: 1200, status: 'rejected' }],
  });
  assert.equal(mealAllocation.allocations.reduce((total, item) => total + item.mealCost, 0), 10);
  assert.equal(pending.outstanding, foodSplit.outstanding);
  assert.equal(pending.pendingPayments, 1200);
  assert.equal(confirmed.outstanding, foodSplit.outstanding - 1200);
  assert.equal(rejected.outstanding, foodSplit.outstanding);
});
