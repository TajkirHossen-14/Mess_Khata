import test from 'node:test';
import assert from 'node:assert/strict';
import { formatTaka } from '../utils/formatTaka.js';
import { isPastDhakaHour } from '../utils/dateTime.js';
import { getReminderOffset } from '../jobs/billDueReminder.js';

test('formatTaka', () => {
  assert.equal(formatTaka(5300), '৳5,300');
  assert.equal(formatTaka(0), '৳0');
  assert.equal(formatTaka(1234567), '৳1,234,567');
  assert.equal(formatTaka(-200), '-৳200');
});

test('isPastDhakaHour', () => {
  const d = new Date('2026-10-22T02:59:00Z'); // 08:59 Dhaka
  assert.equal(isPastDhakaHour(d, 9), false);
  const d2 = new Date('2026-10-22T03:00:00Z'); // 09:00 Dhaka
  assert.equal(isPastDhakaHour(d2, 9), true);
});

test('getReminderOffset returns 2 | 0 | -1 | null', () => {
  assert.equal(getReminderOffset('2026-10-25', '2026-10-23'), 2);
  assert.equal(getReminderOffset('2026-10-23', '2026-10-23'), 0);
  assert.equal(getReminderOffset('2026-10-22', '2026-10-23'), -1);
  assert.equal(getReminderOffset('2026-10-20', '2026-10-23'), null);
  assert.equal(getReminderOffset('2026-10-24', '2026-10-23'), null);
});
