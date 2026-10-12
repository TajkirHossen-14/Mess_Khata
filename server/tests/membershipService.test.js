import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  getResidentByUser,
  isResidentActiveOn,
  overlapsPeriod,
  clipToMembershipWindow,
} from '../services/membershipService.js';

// Mock resident objects for testing
const makeResident = (joiningDate, leavingDate = null) => ({
  _id: 'r1',
  joiningDate: new Date(joiningDate),
  leavingDate: leavingDate ? new Date(leavingDate) : null,
});

describe('membershipService', () => {
  describe('isResidentActiveOn', () => {
    it('active on join day', () => {
      const r = makeResident('2026-10-01T00:00:00.000Z');
      assert.strictEqual(isResidentActiveOn(r, '2026-10-01'), true);
    });

    it('active on leave day (inclusive)', () => {
      const r = makeResident('2026-10-01T00:00:00.000Z', '2026-10-15T00:00:00.000Z');
      assert.strictEqual(isResidentActiveOn(r, '2026-10-15'), true);
    });

    it('inactive the day after leaving', () => {
      const r = makeResident('2026-10-01T00:00:00.000Z', '2026-10-15T00:00:00.000Z');
      assert.strictEqual(isResidentActiveOn(r, '2026-10-16'), false);
    });

    it('inactive before joining', () => {
      const r = makeResident('2026-10-01T00:00:00.000Z');
      assert.strictEqual(isResidentActiveOn(r, '2026-09-30'), false);
    });

    it('no leavingDate means active indefinitely', () => {
      const r = makeResident('2026-10-01T00:00:00.000Z');
      assert.strictEqual(isResidentActiveOn(r, '2027-01-01'), true);
    });

    it('join timestamp at 20:00 UTC maps to NEXT Dhaka date', () => {
      // 2026-10-01T20:00:00Z -> 2026-10-02T02:00:00+06:00 -> Dhaka date is 2026-10-02
      const r = makeResident('2026-10-01T20:00:00.000Z');
      assert.strictEqual(isResidentActiveOn(r, '2026-10-01'), false);
      assert.strictEqual(isResidentActiveOn(r, '2026-10-02'), true);
    });

    it('null resident returns false', () => {
      assert.strictEqual(isResidentActiveOn(null, '2026-10-01'), false);
    });
  });

  describe('overlapsPeriod', () => {
    it('overlapping range returns true', () => {
      const r = makeResident('2026-10-01T00:00:00.000Z', '2026-10-15T00:00:00.000Z');
      assert.strictEqual(overlapsPeriod(r, '2026-10-10', '2026-10-20'), true);
    });

    it('non-overlapping range returns false', () => {
      const r = makeResident('2026-10-01T00:00:00.000Z', '2026-10-15T00:00:00.000Z');
      assert.strictEqual(overlapsPeriod(r, '2026-10-16', '2026-10-20'), false);
    });

    it('range before joining returns false', () => {
      const r = makeResident('2026-10-01T00:00:00.000Z');
      assert.strictEqual(overlapsPeriod(r, '2026-09-01', '2026-09-30'), false);
    });
  });

  describe('clipToMembershipWindow', () => {
    it('clips to membership window', () => {
      const r = makeResident('2026-10-01T00:00:00.000Z', '2026-10-15T00:00:00.000Z');
      const result = clipToMembershipWindow(r, '2026-10-10', '2026-10-20');
      assert.deepStrictEqual(result, { start: '2026-10-10', end: '2026-10-15' });
    });

    it('clips start to join date', () => {
      const r = makeResident('2026-10-01T00:00:00.000Z');
      const result = clipToMembershipWindow(r, '2026-09-01', '2026-10-10');
      assert.deepStrictEqual(result, { start: '2026-10-01', end: '2026-10-10' });
    });

    it('returns null when no overlap', () => {
      const r = makeResident('2026-10-01T00:00:00.000Z', '2026-10-15T00:00:00.000Z');
      const result = clipToMembershipWindow(r, '2026-10-16', '2026-10-20');
      assert.strictEqual(result, null);
    });
  });
});