'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { xpForLevel, totalXpForLevel, randomXp, addXp } = require('../src/utils/leveling');
const config = require('../config.json');

test('xpForLevel increases monotonically', () => {
  let prev = 0;
  for (let lvl = 0; lvl < 20; lvl++) {
    const need = xpForLevel(lvl);
    assert.ok(need > prev, `level ${lvl} should require more XP than the previous`);
    prev = need;
  }
});

test('totalXpForLevel is the cumulative sum of xpForLevel', () => {
  let sum = 0;
  for (let lvl = 0; lvl < 10; lvl++) {
    assert.strictEqual(totalXpForLevel(lvl), sum);
    sum += xpForLevel(lvl);
  }
});

test('randomXp stays within configured bounds', () => {
  const { xpPerMessageMin: min, xpPerMessageMax: max } = config.leveling;
  for (let i = 0; i < 1000; i++) {
    const xp = randomXp();
    assert.ok(xp >= min && xp <= max, `xp ${xp} out of [${min}, ${max}]`);
  }
});

test('addXp does not level up below the threshold', () => {
  const need = xpForLevel(0);
  const res = addXp({ xp: 0, level: 0, total_xp: 0 }, need - 1);
  assert.strictEqual(res.leveledUp, false);
  assert.strictEqual(res.level, 0);
  assert.strictEqual(res.xp, need - 1);
});

test('addXp levels up exactly at the threshold and carries remainder', () => {
  const need = xpForLevel(0);
  const res = addXp({ xp: 0, level: 0, total_xp: 0 }, need + 5);
  assert.strictEqual(res.leveledUp, true);
  assert.strictEqual(res.level, 1);
  assert.strictEqual(res.xp, 5);
});

test('addXp can span multiple levels in one grant', () => {
  const huge = totalXpForLevel(5) + 3;
  const res = addXp({ xp: 0, level: 0, total_xp: 0 }, huge);
  assert.strictEqual(res.level, 5);
  assert.strictEqual(res.xp, 3);
  assert.strictEqual(res.totalXp, huge);
});

test('addXp accumulates total_xp', () => {
  const res = addXp({ xp: 10, level: 2, total_xp: 500 }, 40);
  assert.strictEqual(res.totalXp, 540);
});
