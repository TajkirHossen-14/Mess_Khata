import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isWindowOpen, getCutoff } from '../services/mealWindowService.js';

describe('mealWindowService', () => {
  const lunchMeal = {
    name: 'Lunch',
    time: '13:00',
    deadlineHoursBefore: 4,
  };

  const breakfastMeal = {
    name: 'Breakfast',
    time: '08:00',
    deadlineHoursBefore: 10,
  };

  describe('isWindowOpen', () => {
    it('returns true when now is well before the cutoff', () => {
      // Lunch on 2026-10-15 at 13:00 -> cutoff is 2026-10-15 at 09:00 Dhaka (03:00 UTC)
      // Check at 07:00 Dhaka (01:00 UTC)
      const now = new Date('2026-10-15T01:00:00.000Z');
      assert.strictEqual(isWindowOpen(lunchMeal, '2026-10-15', now), true);
    });

    it('returns false when now is exactly at the cutoff', () => {
      // Cutoff is 09:00 Dhaka (03:00 UTC)
      const now = new Date('2026-10-15T03:00:00.000Z');
      assert.strictEqual(isWindowOpen(lunchMeal, '2026-10-15', now), false);
    });

    it('returns false when now is after the cutoff', () => {
      // 10:00 Dhaka (04:00 UTC)
      const now = new Date('2026-10-15T04:00:00.000Z');
      assert.strictEqual(isWindowOpen(lunchMeal, '2026-10-15', now), false);
    });

    it('handles previous-day cutoff correctly', () => {
      // Breakfast on 2026-10-15 at 08:00 (02:00 UTC) -> 10 hours before is 2026-10-14 at 22:00 Dhaka (16:00 UTC)
      // Check on 2026-10-14 at 20:00 Dhaka (14:00 UTC) -> should be open
      const openTime = new Date('2026-10-14T14:00:00.000Z');
      assert.strictEqual(isWindowOpen(breakfastMeal, '2026-10-15', openTime), true);

      // Check on 2026-10-14 at 23:00 Dhaka (17:00 UTC) -> should be closed
      const closedTime = new Date('2026-10-14T17:00:00.000Z');
      assert.strictEqual(isWindowOpen(breakfastMeal, '2026-10-15', closedTime), false);
    });

    it('returns false for invalid mealType', () => {
      assert.strictEqual(isWindowOpen(null, '2026-10-15'), false);
      assert.strictEqual(isWindowOpen({}, '2026-10-15'), false);
    });
  });

  describe('getCutoff', () => {
    it('returns expected cutoff Date instant', () => {
      const cutoff = getCutoff(lunchMeal, '2026-10-15');
      // 2026-10-15T09:00:00+06:00 is 2026-10-15T03:00:00.000Z
      assert.strictEqual(cutoff.toISOString(), '2026-10-15T03:00:00.000Z');
    });

    it('returns expected previous-day cutoff Date instant for breakfast', () => {
      const cutoff = getCutoff(breakfastMeal, '2026-10-15');
      // 2026-10-14T22:00:00+06:00 is 2026-10-14T16:00:00.000Z
      assert.strictEqual(cutoff.toISOString(), '2026-10-14T16:00:00.000Z');
    });
  });
});
