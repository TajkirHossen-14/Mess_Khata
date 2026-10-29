import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldRemindForDuty, formatDutyReminder } from '../jobs/dutyReminder.js';

const tomorrow = '2026-10-23';

test('shouldRemindForDuty assigned tomorrow', () => {
  const a = { status: 'assigned', date: `${tomorrow}T00:00:00.000Z`, type: 'bazar' };
  const r = { joiningDate: '2026-01-01' };
  assert.equal(shouldRemindForDuty({ assignment: a, resident: r, tomorrowStr: tomorrow }), true);
});

test('shouldRemindForDuty cancelled false', () => {
  const a = { status: 'cancelled', date: `${tomorrow}T00:00:00.000Z`, type: 'bazar' };
  const r = { joiningDate: '2026-01-01' };
  assert.equal(shouldRemindForDuty({ assignment: a, resident: r, tomorrowStr: tomorrow }), false);
});

test('shouldRemindForDuty completed false', () => {
  const a = { status: 'completed', date: `${tomorrow}T00:00:00.000Z`, type: 'bazar' };
  const r = { joiningDate: '2026-01-01' };
  assert.equal(shouldRemindForDuty({ assignment: a, resident: r, tomorrowStr: tomorrow }), false);
});

test('shouldRemindForDuty dated today false', () => {
  const a = { status: 'assigned', date: '2026-10-22T00:00:00.000Z', type: 'bazar' };
  const r = { joiningDate: '2026-01-01' };
  assert.equal(shouldRemindForDuty({ assignment: a, resident: r, tomorrowStr: tomorrow }), false);
});

test('shouldRemindForDuty resident left before tomorrow false', () => {
  const a = { status: 'assigned', date: `${tomorrow}T00:00:00.000Z`, type: 'bazar' };
  const r = { joiningDate: '2026-01-01', leavingDate: '2026-10-22T00:00:00.000Z' };
  assert.equal(shouldRemindForDuty({ assignment: a, resident: r, tomorrowStr: tomorrow }), false);
});

test('shouldRemindForDuty leavingDate equal to tomorrow true (inclusive)', () => {
  const a = { status: 'assigned', date: `${tomorrow}T00:00:00.000Z`, type: 'bazar' };
  const r = { joiningDate: '2026-01-01', leavingDate: `${tomorrow}T00:00:00.000Z` };
  assert.equal(shouldRemindForDuty({ assignment: a, resident: r, tomorrowStr: tomorrow }), true);
});

test('formatDutyReminder names the duty and the Dhaka date', () => {
  const text = formatDutyReminder({ type: 'room_cleaning', date: `${tomorrow}T00:00:00.000Z` });
  assert.ok(text.startsWith('Tomorrow,'), text);
  assert.ok(text.includes('23 Oct'), text);
  assert.ok(text.includes('Room cleaning duty'), text);
});
