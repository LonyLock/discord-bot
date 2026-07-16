'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { parseDuration, formatDuration, relative, fullTimestamp } = require('../src/utils/time');

test('parseDuration: single units', () => {
  assert.strictEqual(parseDuration('10s'), 10_000);
  assert.strictEqual(parseDuration('5m'), 5 * 60_000);
  assert.strictEqual(parseDuration('2h'), 2 * 3_600_000);
  assert.strictEqual(parseDuration('3d'), 3 * 86_400_000);
  assert.strictEqual(parseDuration('1w'), 604_800_000);
});

test('parseDuration: combined and long forms', () => {
  assert.strictEqual(parseDuration('1h30m'), 90 * 60_000);
  assert.strictEqual(parseDuration('1 hour 30 minutes'), 90 * 60_000);
  assert.strictEqual(parseDuration('2d 4h'), 2 * 86_400_000 + 4 * 3_600_000);
});

test('parseDuration: invalid input returns null', () => {
  assert.strictEqual(parseDuration(''), null);
  assert.strictEqual(parseDuration(null), null);
  assert.strictEqual(parseDuration('forever'), null);
  assert.strictEqual(parseDuration('abc'), null);
});

test('formatDuration: human readable', () => {
  assert.strictEqual(formatDuration(0), '0s');
  assert.strictEqual(formatDuration(500), '0s');
  assert.strictEqual(formatDuration(1000), '1s');
  assert.strictEqual(formatDuration(90 * 60_000), '1h 30m');
  assert.strictEqual(formatDuration(86_400_000), '1d');
});

test('formatDuration: caps at three components', () => {
  const parts = formatDuration(604_800_000 + 86_400_000 + 3_600_000 + 60_000).split(' ');
  assert.ok(parts.length <= 3);
});

test('parseDuration and formatDuration round-trip closely', () => {
  const ms = parseDuration('2h15m');
  assert.strictEqual(formatDuration(ms), '2h 15m');
});

test('relative / fullTimestamp produce Discord markup', () => {
  assert.match(relative(1_700_000_000_000), /^<t:1700000000:R>$/);
  assert.match(fullTimestamp(1_700_000_000_000), /^<t:1700000000:F>$/);
});
