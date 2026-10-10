import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  toCalendarDate,
  calendarDateString,
  toDhakaDateString,
  todayDhaka,
  addDays,
  getMealDateTime,
  getCutoffAt,
  getCutoffClock,
} from '../utils/dateTime.js';

describe('toCalendarDate', () => {
  it('parses a valid date to UTC midnight', () => {
    const d = toCalendarDate('2026-03-15');
    assert.equal(d.toISOString(), '2026-03-15T00:00:00.000Z');
  });

  it('rejects non-existent date 2026-02-30', () => {
    assert.throws(() => toCalendarDate('2026-02-30'), (err) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /does not exist/);
      return true;
    });
  });

  it('rejects April 31', () => {
    assert.throws(() => toCalendarDate('2026-04-31'), (err) => {
      assert.equal(err.statusCode, 400);
      return true;
    });
  });

  it('rejects invalid format', () => {
    assert.throws(() => toCalendarDate('15-03-2026'), (err) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /Invalid date format/);
      return true;
    });
  });

  it('rejects non-string input', () => {
    assert.throws(() => toCalendarDate(12345), (err) => {
      assert.equal(err.statusCode, 400);
      return true;
    });
  });
});

describe('calendarDateString', () => {
  it('is the inverse of toCalendarDate', () => {
    const d = toCalendarDate('2026-01-05');
    assert.equal(calendarDateString(d), '2026-01-05');
  });
});

describe('toDhakaDateString', () => {
  it('maps a UTC timestamp at 18:30 to the NEXT Dhaka date', () => {
    // 2026-10-14 18:30 UTC = 2026-10-15 00:30 Dhaka
    const ts = new Date('2026-10-14T18:30:00Z');
    assert.equal(toDhakaDateString(ts), '2026-10-15');
  });

  it('maps a UTC timestamp at 17:59 to the same Dhaka date', () => {
    // 2026-10-14 17:59 UTC = 2026-10-14 23:59 Dhaka
    const ts = new Date('2026-10-14T17:59:00Z');
    assert.equal(toDhakaDateString(ts), '2026-10-14');
  });
});

describe('todayDhaka', () => {
  it('rolls over when UTC time is 18:30 (00:30 next day in Dhaka)', () => {
    const now = new Date('2026-10-14T18:30:00Z');
    assert.equal(todayDhaka(now), '2026-10-15');
  });

  it('stays same day when UTC is 05:00 (11:00 Dhaka)', () => {
    const now = new Date('2026-10-14T05:00:00Z');
    assert.equal(todayDhaka(now), '2026-10-14');
  });
});

describe('addDays', () => {
  it('adds positive days', () => {
    assert.equal(addDays('2026-01-30', 3), '2026-02-02');
  });

  it('adds negative days', () => {
    assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  });

  it('handles month boundary', () => {
    assert.equal(addDays('2026-01-31', 1), '2026-02-01');
  });
});

describe('getMealDateTime', () => {
  it('returns the correct instant in Dhaka time', () => {
    const dt = getMealDateTime('2026-10-14', '13:00');
    // 13:00 Dhaka = 07:00 UTC
    assert.equal(dt.toISOString(), '2026-10-14T07:00:00.000Z');
  });

  it('rejects invalid time format', () => {
    assert.throws(() => getMealDateTime('2026-10-14', '25:00'), (err) => {
      assert.equal(err.statusCode, 400);
      return true;
    });
  });
});

describe('getCutoffAt', () => {
  it('same-day cutoff: lunch 13:00, 4h before -> 09:00 Dhaka', () => {
    const mealType = { time: '13:00', deadlineHoursBefore: 4 };
    const cutoff = getCutoffAt('2026-10-14', mealType);
    // 09:00 Dhaka = 03:00 UTC
    assert.equal(cutoff.toISOString(), '2026-10-14T03:00:00.000Z');
  });

  it('previous-day cutoff: breakfast 08:00, 10h before -> 22:00 the day before', () => {
    const mealType = { time: '08:00', deadlineHoursBefore: 10 };
    const cutoff = getCutoffAt('2026-10-14', mealType);
    // 22:00 Dhaka on Oct 13 = 16:00 UTC on Oct 13
    assert.equal(cutoff.toISOString(), '2026-10-13T16:00:00.000Z');
  });
});

describe('getCutoffClock', () => {
  it('same-day cutoff: lunch 13:00, 4h -> 09:00, dayOffset 0', () => {
    const result = getCutoffClock('13:00', 4);
    assert.equal(result.time, '09:00');
    assert.equal(result.dayOffset, 0);
  });

  it('previous-day cutoff: breakfast 08:00, 10h -> 22:00, dayOffset -1', () => {
    const result = getCutoffClock('08:00', 10);
    assert.equal(result.time, '22:00');
    assert.equal(result.dayOffset, -1);
  });

  it('two days before: breakfast 08:00, 34h -> 22:00, dayOffset -2', () => {
    const result = getCutoffClock('08:00', 34);
    assert.equal(result.time, '22:00');
    assert.equal(result.dayOffset, -2);
  });

  it('zero hours before: dinner 20:00, 0h -> 20:00, dayOffset 0', () => {
    const result = getCutoffClock('20:00', 0);
    assert.equal(result.time, '20:00');
    assert.equal(result.dayOffset, 0);
  });

  it('exact midnight boundary: 06:00, 6h -> 00:00, dayOffset 0', () => {
    const result = getCutoffClock('06:00', 6);
    assert.equal(result.time, '00:00');
    assert.equal(result.dayOffset, 0);
  });

  it('crosses midnight: 01:00, 2h -> 23:00, dayOffset -1', () => {
    const result = getCutoffClock('01:00', 2);
    assert.equal(result.time, '23:00');
    assert.equal(result.dayOffset, -1);
  });
});

