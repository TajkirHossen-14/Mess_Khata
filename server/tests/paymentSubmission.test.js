import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { submitPayment } from '../controllers/paymentController.js';
import Payment from '../models/Payment.js';
import BillingPeriod from '../models/BillingPeriod.js';
import Resident from '../models/Resident.js';
import paymentRoutes from '../routes/paymentRoutes.js';
import { signToken } from '../utils/jwt.js';

const ids = {
  billingPeriodId: '64b000000000000000000001',
  residentId: '64b000000000000000000002',
  messId: '64b000000000000000000003',
  userId: '64b000000000000000000004',
  foreignBillingPeriodId: '64b000000000000000000005',
  foreignMessId: '64b000000000000000000006',
  spoofedResidentId: '64b000000000000000000007',
};

const paymentData = (overrides = {}) => ({
  ...ids,
  amount: 2500,
  method: 'cash',
  ...overrides,
});

test('new payments default to pending and preserve billing relationships', () => {
  const payment = new Payment(paymentData({ status: undefined }));
  assert.equal(payment.status, 'pending');
  assert.equal(String(payment.billingPeriodId), ids.billingPeriodId);
  assert.equal(String(payment.residentId), ids.residentId);
});

test('payment model accepts supported methods and an optional trimmed reference', async () => {
  for (const method of ['cash', 'bKash', 'Nagad']) {
    const payment = new Payment(paymentData({ method, transactionReference: '  TX-123  ' }));
    await payment.validate();
    assert.equal(payment.transactionReference, 'TX-123');
  }

  const cashPayment = new Payment(paymentData());
  await cashPayment.validate();
  assert.equal(cashPayment.transactionReference, undefined);
});

test('payment model rejects invalid method, status, and non-positive or fractional amounts', async () => {
  for (const overrides of [
    { method: 'card' },
    { status: 'Confirmed' },
    { amount: 0 },
    { amount: -1 },
    { amount: 1.5 },
    { amount: Number.MAX_SAFE_INTEGER + 1 },
  ]) {
    await assert.rejects(new Payment(paymentData(overrides)).validate());
  }
});

test('supplied transaction references must be non-empty and within the model limit', async () => {
  for (const transactionReference of ['   ', 'x'.repeat(201)]) {
    const payment = new Payment(paymentData({ transactionReference }));
    await assert.rejects(payment.validate());
  }
});

const invokeSubmission = async (body, { periodFound = true, residentFound = true } = {}) => {
  const originals = {
    findPeriod: BillingPeriod.findOne,
    findResident: Resident.findOne,
    createPayment: Payment.create,
  };
  const saved = [];
  BillingPeriod.findOne = (query) => ({
    select: async () => periodFound ? { _id: query._id } : null,
  });
  Resident.findOne = async (query) => residentFound
    ? { _id: ids.residentId, userId: query.userId, messId: query.messId }
    : null;
  Payment.create = async (data) => {
    saved.push(data);
    return data;
  };

  const response = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };
  try {
    await submitPayment({
      body,
      messId: '64b000000000000000000003',
      user: { id: '64b000000000000000000004' },
    }, response);
    return { response, saved };
  } finally {
    BillingPeriod.findOne = originals.findPeriod;
    Resident.findOne = originals.findResident;
    Payment.create = originals.createPayment;
  }
};

test('submission accepts cash and digital methods, forces pending, and uses authenticated scope', async () => {
  for (const [method, transactionReference] of [
    ['cash', undefined],
    ['bKash', '  BK-123  '],
    ['Nagad', ' NG-456 '],
  ]) {
    const { response, saved } = await invokeSubmission({
      amount: 2500,
      method,
      billingPeriodId: ids.billingPeriodId,
      transactionReference,
      status: 'confirmed',
      residentId: '64b000000000000000000099',
      messId: '64b000000000000000000098',
    });
    assert.equal(response.statusCode, 201);
    assert.equal(response.payload.success, true);
    assert.equal(saved.length, 1);
    assert.equal(saved[0].status, 'pending');
    assert.equal(String(saved[0].residentId), ids.residentId);
    assert.equal(String(saved[0].billingPeriodId), ids.billingPeriodId);
    assert.equal(saved[0].transactionReference, transactionReference?.trim());
    assert.equal('messId' in saved[0], false);
  }
});

test('submission rejects invalid amounts, methods, and malformed references before saving', async () => {
  for (const body of [
    { amount: undefined, method: 'cash', billingPeriodId: ids.billingPeriodId },
    { amount: 0, method: 'cash', billingPeriodId: ids.billingPeriodId },
    { amount: -1, method: 'cash', billingPeriodId: ids.billingPeriodId },
    { amount: 1.5, method: 'cash', billingPeriodId: ids.billingPeriodId },
    { amount: 1, method: 'card', billingPeriodId: ids.billingPeriodId },
    { amount: 1, method: 'bKash', billingPeriodId: ids.billingPeriodId, transactionReference: ' ' },
    { amount: 1, method: 'Nagad', billingPeriodId: ids.billingPeriodId, transactionReference: 123 },
  ]) {
    const { response, saved } = await invokeSubmission(body);
    assert.equal(response.statusCode, 400);
    assert.equal(response.payload.success, false);
    assert.equal(saved.length, 0);
  }
});

test('submission does not save for a foreign billing period or missing resident membership', async () => {
  for (const options of [{ periodFound: false }, { residentFound: false }]) {
    const { response, saved } = await invokeSubmission({
      amount: 100,
      method: 'cash',
      billingPeriodId: ids.billingPeriodId,
    }, options);
    assert.equal(response.statusCode, 404);
    assert.equal(response.payload.success, false);
    assert.equal(saved.length, 0);
  }
});

const withPaymentRoute = async (run) => {
  const originals = {
    findPeriod: BillingPeriod.findOne,
    findResident: Resident.findOne,
    createPayment: Payment.create,
    jwtSecret: process.env.JWT_SECRET,
  };
  const saved = [];
  const periodQueries = [];
  const residentQueries = [];
  const periods = [
    { _id: ids.billingPeriodId, messId: ids.messId },
    { _id: ids.foreignBillingPeriodId, messId: ids.foreignMessId },
  ];
  const residents = [
    { _id: ids.residentId, userId: ids.userId, messId: ids.messId },
  ];

  BillingPeriod.findOne = (query) => {
    periodQueries.push(query);
    return {
      select: async () => periods.find((period) =>
        String(period._id) === String(query._id)
        && String(period.messId) === String(query.messId)) ?? null,
    };
  };
  Resident.findOne = async (query) => {
    residentQueries.push(query);
    return residents.find((resident) =>
      String(resident.userId) === String(query.userId)
      && String(resident.messId) === String(query.messId)) ?? null;
  };
  Payment.create = async (data) => {
    saved.push({ ...data });
    return { ...data };
  };

  process.env.JWT_SECRET = 'payment-submission-test-secret';
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
    const request = async ({ token, body } = {}) => {
      const headers = { 'content-type': 'application/json' };
      if (token) headers.authorization = `Bearer ${token}`;
      const response = await fetch(`http://127.0.0.1:${address.port}/api/payments`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body ?? {
          amount: 2500,
          method: 'cash',
          billingPeriodId: ids.billingPeriodId,
        }),
      });
      return { status: response.status, body: await response.json() };
    };
    const tokenFor = (roles, overrides = {}) => signToken({
      id: ids.userId,
      messId: ids.messId,
      roles,
      ...overrides,
    });
    await run({ request, tokenFor, saved, periodQueries, residentQueries });
  } finally {
    await new Promise((resolve) => server.close(resolve));
    BillingPeriod.findOne = originals.findPeriod;
    Resident.findOne = originals.findResident;
    Payment.create = originals.createPayment;
    if (originals.jwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originals.jwtSecret;
  }
};

test('payment route rejects unauthenticated and non-resident requests', async () => {
  await withPaymentRoute(async ({ request, tokenFor, saved }) => {
    const unauthenticated = await request();
    assert.equal(unauthenticated.status, 401);
    assert.equal(unauthenticated.body.success, false);

    const managerOnly = await request({ token: tokenFor(['manager']) });
    assert.equal(managerOnly.status, 403);
    assert.equal(managerOnly.body.success, false);
    assert.equal(saved.length, 0);
  });
});

test('authenticated resident reaches the mounted payment submission route', async () => {
  await withPaymentRoute(async ({ request, tokenFor, saved }) => {
    const result = await request({ token: tokenFor(['resident']) });
    assert.equal(result.status, 201);
    assert.equal(result.body.success, true);
    assert.equal(result.body.data.status, 'pending');
    assert.equal(saved.length, 1);
  });
});

test('payment route enforces mess-scoped billing period and authenticated resident predicates', async () => {
  await withPaymentRoute(async ({ request, tokenFor, saved, periodQueries, residentQueries }) => {
    const valid = await request({
      token: tokenFor(['resident']),
      body: {
        amount: 2500,
        method: 'cash',
        billingPeriodId: ids.billingPeriodId,
        residentId: ids.spoofedResidentId,
      },
    });
    assert.equal(valid.status, 201);
    assert.equal(periodQueries[0]._id, ids.billingPeriodId);
    assert.equal(periodQueries[0].messId, ids.messId);
    assert.equal(residentQueries[0].userId, ids.userId);
    assert.equal(residentQueries[0].messId, ids.messId);
    assert.equal(String(saved[0].residentId), ids.residentId);
    assert.notEqual(String(saved[0].residentId), ids.spoofedResidentId);

    const foreignPeriod = await request({
      token: tokenFor(['resident']),
      body: {
        amount: 2500,
        method: 'cash',
        billingPeriodId: ids.foreignBillingPeriodId,
      },
    });
    assert.equal(foreignPeriod.status, 404);
    assert.equal(foreignPeriod.body.success, false);
    assert.equal(periodQueries[1].messId, ids.messId);
    assert.equal(saved.length, 1);
  });
});
