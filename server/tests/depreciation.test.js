import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import Resident from '../models/Resident.js';
import ResidentSharedAsset from '../models/ResidentSharedAsset.js';
import SharedAsset from '../models/SharedAsset.js';
import { getSharedAssetDepreciation } from '../controllers/depreciationController.js';
import { calculateAnnualDepreciation } from '../services/depreciationService.js';

const assetId = '64c2e9b7a1d4f30123456789';
const residentA = '64c2e9b7a1d4f30123456780';
const residentB = '64c2e9b7a1d4f30123456781';
const residentC = '64c2e9b7a1d4f30123456782';

const responseRecorder = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

const participant = (residentId, name = 'Resident') => ({ residentId, name });

describe('annual straight-line depreciation', () => {
  it('calculates 32000 / 8 years as 4000 per year', () => {
    const result = calculateAnnualDepreciation({
      purchasePrice: 32000,
      usefulLife: 8,
      participants: [participant(residentA)],
    });
    assert.equal(result.annualDepreciation, 4000);
    assert.equal(result.participants[0].annualShare, 4000);
  });

  it('splits annual depreciation equally across participants', () => {
    const result = calculateAnnualDepreciation({
      purchasePrice: 32000,
      usefulLife: 8,
      participants: [participant(residentC), participant(residentA), participant(residentB), participant('64c2e9b7a1d4f30123456783')],
    });
    assert.deepEqual(result.participants.map(({ annualShare }) => annualShare), [1000, 1000, 1000, 1000]);
  });

  it('keeps participant shares equal to the total at poisha precision', () => {
    const result = calculateAnnualDepreciation({
      purchasePrice: 32000.01,
      usefulLife: 8,
      participants: [participant(residentA), participant(residentB), participant(residentC)],
    });
    const sharePoisha = result.participants.reduce((sum, item) => sum + Math.round(item.annualShare * 100), 0);
    assert.equal(sharePoisha, Math.round(result.annualDepreciation * 100));
  });

  it('rounds half a poisha up and distributes remainder in sorted resident ID order', () => {
    const result = calculateAnnualDepreciation({
      purchasePrice: 1,
      usefulLife: 8,
      participants: [participant(residentB), participant(residentA)],
    });
    assert.equal(result.annualDepreciation, 0.13);
    assert.deepEqual(result.participants.map(({ residentId }) => residentId), [residentA, residentB]);
    assert.deepEqual(result.participants.map(({ annualShare }) => annualShare), [0.07, 0.06]);
    assert.equal(result.participants.reduce((sum, item) => sum + Math.round(item.annualShare * 100), 0), 13);
  });
});

describe('depreciation endpoint', () => {
  afterEach(() => mock.restoreAll());

  const residentQuery = (records) => ({
    select: async () => records,
  });

  it('rejects an invalid asset ID', async () => {
    const res = responseRecorder();
    await getSharedAssetDepreciation({ params: { id: 'bad-id' }, messId: 'mess-1' }, res, (error) => { throw error; });
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /invalid shared asset ID/i);
  });

  it('returns not found when the asset is absent from the current mess', async (t) => {
    let query;
    t.mock.method(SharedAsset, 'findOne', async (filter) => { query = filter; return null; });
    const res = responseRecorder();
    await getSharedAssetDepreciation({ params: { id: assetId }, messId: 'mess-1' }, res, (error) => { throw error; });
    assert.deepEqual(query, { _id: assetId, messId: 'mess-1' });
    assert.equal(res.statusCode, 404);
    assert.match(res.body.message, /not found/i);
  });

  it('returns a clear error when the asset has no participant links', async (t) => {
    t.mock.method(SharedAsset, 'findOne', async () => ({ _id: assetId, purchasePrice: 100, usefulLife: 10 }));
    t.mock.method(ResidentSharedAsset, 'find', () => ({
      populate() { return this; },
      sort: async () => [],
    }));
    const res = responseRecorder();
    await getSharedAssetDepreciation({ params: { id: assetId }, messId: 'mess-1' }, res, (error) => { throw error; });
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /no participants/i);
  });

  it('returns participant identity and annual shares for valid residents in the asset mess', async (t) => {
    const asset = { _id: assetId, messId: 'mess-1', purchasePrice: 32000, usefulLife: 8 };
    const residents = [
      { _id: residentA, messId: 'mess-1', userId: { name: 'Amina', email: 'amina@example.com' } },
      { _id: residentB, messId: 'mess-1', userId: { name: 'Bashir', email: 'bashir@example.com' } },
    ];
    t.mock.method(SharedAsset, 'findOne', async () => asset);
    t.mock.method(ResidentSharedAsset, 'find', () => ({
      sort: async () => [{ residentId: residentA }, { residentId: residentB }],
    }));
    t.mock.method(Resident, 'find', () => residentQuery(residents));
    t.mock.method(Resident, 'populate', async (records) => records);
    const res = responseRecorder();

    await getSharedAssetDepreciation({ params: { id: assetId }, messId: 'mess-1' }, res, (error) => { throw error; });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.annualDepreciation, 4000);
    assert.deepEqual(res.body.data.participants, [
      { residentId: residentA, name: 'Amina', email: 'amina@example.com', annualShare: 2000 },
      { residentId: residentB, name: 'Bashir', email: 'bashir@example.com', annualShare: 2000 },
    ]);
  });

  it('rejects a linked resident from a different mess without exposing their details', async (t) => {
    const asset = { _id: assetId, messId: 'mess-1', purchasePrice: 32000, usefulLife: 8 };
    const residents = [
      { _id: residentA, messId: 'mess-1', userId: { name: 'Amina', email: 'amina@example.com' } },
      { _id: residentB, messId: 'mess-2', userId: { name: 'Other', email: 'other@example.com' } },
    ];
    t.mock.method(SharedAsset, 'findOne', async () => asset);
    t.mock.method(ResidentSharedAsset, 'find', () => ({
      sort: async () => [{ residentId: residentA }, { residentId: residentB }],
    }));
    t.mock.method(Resident, 'find', () => residentQuery(residents));
    t.mock.method(Resident, 'populate', async () => { throw new Error('Cross-mess user details must not be populated'); });
    const res = responseRecorder();

    await getSharedAssetDepreciation({ params: { id: assetId }, messId: 'mess-1' }, res, (error) => { throw error; });

    assert.equal(res.statusCode, 409);
    assert.deepEqual(res.body, {
      success: false,
      message: 'Shared asset participant records are inconsistent',
    });
  });

  it('rejects a linked resident record that no longer exists', async (t) => {
    const asset = { _id: assetId, messId: 'mess-1', purchasePrice: 32000, usefulLife: 8 };
    t.mock.method(SharedAsset, 'findOne', async () => asset);
    t.mock.method(ResidentSharedAsset, 'find', () => ({
      sort: async () => [{ residentId: residentA }],
    }));
    t.mock.method(Resident, 'find', () => residentQuery([]));
    t.mock.method(Resident, 'populate', async () => { throw new Error('Missing resident details must not be populated'); });
    const res = responseRecorder();

    await getSharedAssetDepreciation({ params: { id: assetId }, messId: 'mess-1' }, res, (error) => { throw error; });

    assert.equal(res.statusCode, 409);
    assert.deepEqual(res.body, {
      success: false,
      message: 'Shared asset participant records are inconsistent',
    });
  });
});
