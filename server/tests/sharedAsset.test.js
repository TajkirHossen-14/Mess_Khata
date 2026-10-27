import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import Resident from '../models/Resident.js';
import ResidentSharedAsset from '../models/ResidentSharedAsset.js';
import SharedAsset from '../models/SharedAsset.js';
import { createSharedAsset, validateSharedAssetInput } from '../controllers/sharedAssetController.js';

const validIds = ['64c2e9b7a1d4f30123456789', '64c2e9b7a1d4f30123456780'];
const validBody = (participantIds = [validIds[0]]) => ({
  name: 'Fridge',
  purchasePrice: '32000',
  purchaseDate: '2025-03-15',
  usefulLife: '8',
  participantIds,
});

const responseRecorder = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

describe('shared asset request validation', () => {
  it('normalizes a valid payload', () => {
    const result = validateSharedAssetInput(validBody());
    assert.equal(result.value.name, 'Fridge');
    assert.equal(result.value.purchasePrice, 32000);
    assert.equal(result.value.usefulLife, 8);
    assert.equal(result.value.purchaseDate.toISOString(), '2025-03-15T00:00:00.000Z');
  });

  const cases = [
    ['missing name', (body) => { delete body.name; }, /name/i],
    ['missing price', (body) => { delete body.purchasePrice; }, /purchase price/i],
    ['zero price', (body) => { body.purchasePrice = 0; }, /purchase price/i],
    ['negative price', (body) => { body.purchasePrice = -1; }, /purchase price/i],
    ['nonnumeric price', (body) => { body.purchasePrice = 'abc'; }, /purchase price/i],
    ['infinite price', (body) => { body.purchasePrice = 'Infinity'; }, /purchase price/i],
    ['missing date', (body) => { delete body.purchaseDate; }, /purchase date/i],
    ['invalid date', (body) => { body.purchaseDate = '2025-02-30'; }, /purchase date/i],
    ['missing useful life', (body) => { delete body.usefulLife; }, /useful life/i],
    ['zero useful life', (body) => { body.usefulLife = '0'; }, /useful life/i],
    ['negative useful life', (body) => { body.usefulLife = -3; }, /useful life/i],
    ['nonnumeric useful life', (body) => { body.usefulLife = 'years'; }, /useful life/i],
    ['infinite useful life', (body) => { body.usefulLife = 'Infinity'; }, /useful life/i],
    ['missing participants', (body) => { delete body.participantIds; }, /participant/i],
    ['empty participants', (body) => { body.participantIds = []; }, /participant/i],
    ['malformed participant', (body) => { body.participantIds = ['abc']; }, /valid resident ID/i],
    ['duplicate participants', (body) => { body.participantIds = [validIds[0], validIds[0]]; }, /duplicates/i],
  ];

  for (const [label, mutate, expected] of cases) {
    it(`rejects ${label}`, () => {
      const body = validBody();
      mutate(body);
      assert.match(validateSharedAssetInput(body).error, expected);
    });
  }
});

describe('shared asset creation', () => {
  afterEach(() => mock.restoreAll());

  it('creates an asset and one unique link per selected resident', async (t) => {
    const asset = { _id: 'asset-1', name: 'Fridge', messId: 'mess-1' };
    const links = [];
    t.mock.method(Resident, 'find', () => ({
      populate: async () => validIds.map((id) => ({ _id: id, userId: { name: 'Resident', email: 'resident@example.com' } })),
    }));
    t.mock.method(SharedAsset, 'create', async (data) => Object.assign(asset, data));
    t.mock.method(ResidentSharedAsset, 'insertMany', async (data) => { links.push(...data); return data; });

    const res = responseRecorder();
    await createSharedAsset({ body: validBody(validIds), messId: 'mess-1' }, res, (error) => { throw error; });

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.data.asset.purchasePrice, 32000);
    assert.equal(res.body.data.asset.purchaseDate.toISOString(), '2025-03-15T00:00:00.000Z');
    assert.equal(res.body.data.asset.usefulLife, 8);
    assert.equal(links.length, 2);
    assert.deepEqual(links.map((link) => String(link.residentId)), validIds);
    assert.ok(links.every((link) => link.sharedAssetId === asset._id));
    assert.equal(new Set(links.map((link) => String(link.residentId))).size, 2);
  });

  it('cleans up the asset and partial links when linking fails', async (t) => {
    const asset = { _id: 'asset-2' };
    let deletedAsset = false;
    let deletedLinks = false;
    t.mock.method(Resident, 'find', () => ({ populate: async () => validIds.map((_id) => ({ _id })) }));
    t.mock.method(SharedAsset, 'create', async () => asset);
    t.mock.method(ResidentSharedAsset, 'insertMany', async () => { throw new Error('link write failed'); });
    t.mock.method(ResidentSharedAsset, 'deleteMany', async () => { deletedLinks = true; });
    t.mock.method(SharedAsset, 'deleteOne', async () => { deletedAsset = true; });
    const res = responseRecorder();
    let passedError;

    await createSharedAsset({ body: validBody(validIds), messId: 'mess-1' }, res, (error) => { passedError = error; });

    assert.equal(deletedLinks, true);
    assert.equal(deletedAsset, true);
    assert.match(passedError.message, /link write failed/);
  });
});
