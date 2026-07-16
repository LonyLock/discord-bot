'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const {
  clamp, randInt, pick, formatNumber, shuffle, truncate, progressBar,
} = require('../src/utils/helpers');

test('clamp bounds values', () => {
  assert.strictEqual(clamp(5, 0, 10), 5);
  assert.strictEqual(clamp(-3, 0, 10), 0);
  assert.strictEqual(clamp(99, 0, 10), 10);
});

test('randInt stays within [min, max] inclusive', () => {
  for (let i = 0; i < 1000; i++) {
    const n = randInt(1, 6);
    assert.ok(n >= 1 && n <= 6);
    assert.ok(Number.isInteger(n));
  }
});

test('randInt with equal bounds returns that value', () => {
  assert.strictEqual(randInt(7, 7), 7);
});

test('pick returns an element from the array', () => {
  const arr = ['a', 'b', 'c'];
  for (let i = 0; i < 100; i++) assert.ok(arr.includes(pick(arr)));
});

test('formatNumber inserts thousands separators', () => {
  assert.strictEqual(formatNumber(1000), '1,000');
  assert.strictEqual(formatNumber(1234567), '1,234,567');
  assert.strictEqual(formatNumber(5), '5');
});

test('shuffle preserves elements and does not mutate input', () => {
  const original = [1, 2, 3, 4, 5];
  const copy = [...original];
  const result = shuffle(original);
  assert.deepStrictEqual(original, copy, 'input array must not be mutated');
  assert.deepStrictEqual([...result].sort((a, b) => a - b), original);
});

test('truncate shortens long strings with an ellipsis', () => {
  assert.strictEqual(truncate('hello', 10), 'hello');
  const long = 'x'.repeat(2000);
  const out = truncate(long, 100);
  assert.strictEqual(out.length, 100);
  assert.ok(out.endsWith('…'));
});

test('truncate handles empty/undefined gracefully', () => {
  assert.strictEqual(truncate('', 10), '');
  assert.strictEqual(truncate(undefined, 10), undefined);
});

test('progressBar length is constant and reflects ratio', () => {
  assert.strictEqual(progressBar(0, 100, 20).length, 20);
  assert.strictEqual(progressBar(50, 100, 20), '█'.repeat(10) + '░'.repeat(10));
  assert.strictEqual(progressBar(100, 100, 10), '█'.repeat(10));
  // Over-full ratio is clamped, never exceeding the bar size.
  assert.strictEqual(progressBar(200, 100, 10), '█'.repeat(10));
  // Zero total does not divide by zero.
  assert.strictEqual(progressBar(5, 0, 10), '░'.repeat(10));
});
