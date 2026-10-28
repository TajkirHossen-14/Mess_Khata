import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatTaka } from './money.js';

describe('formatTaka', () => {
  it('groups thousands with the taka sign', () => {
    assert.equal(formatTaka(5300), '৳5,300');
    assert.equal(formatTaka(1234567), '৳1,234,567');
  });

  it('renders zero', () => {
    assert.equal(formatTaka(0), '৳0');
  });

  it('formats negatives with a leading minus before the sign', () => {
    assert.equal(formatTaka(-200), '-৳200');
    assert.equal(formatTaka(-1234567), '-৳1,234,567');
  });

  it('truncates fractional amounts to whole Taka', () => {
    assert.equal(formatTaka(5300.9), '৳5,300');
  });

  it('coerces numeric strings and treats non-numbers as zero', () => {
    assert.equal(formatTaka('5300'), '৳5,300');
    assert.equal(formatTaka('abc'), '৳0');
    assert.equal(formatTaka(null), '৳0');
    assert.equal(formatTaka(undefined), '৳0');
  });
});
