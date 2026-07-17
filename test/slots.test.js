'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { spin, evaluate, paylines, MODES, ROWS } = require('../src/utils/slots');

test('paylines cover 3 rows + 2 diagonals for each grid', () => {
  assert.strictEqual(paylines(5).length, 5);
  // Every payline spans exactly one cell per column.
  for (const cols of [3, 5]) {
    for (const line of paylines(cols)) {
      assert.strictEqual(line.length, cols);
      const seenCols = new Set(line.map(([, c]) => c));
      assert.strictEqual(seenCols.size, cols);
      for (const [r, c] of line) {
        assert.ok(r >= 0 && r < ROWS && c >= 0 && c < cols);
      }
    }
  }
});

test('a full grid of one symbol wins every payline', () => {
  const grid = Array.from({ length: ROWS }, () => Array(5).fill('7️⃣'));
  const { lines, multiplier } = evaluate(grid);
  assert.strictEqual(lines.length, 5);
  assert.ok(multiplier > 0);
  assert.ok(lines.every((l) => l.symbol === '7️⃣' && l.count === 5));
});

test('a grid with no three-in-a-row from the left pays nothing', () => {
  // Left column deliberately all-different so no line can reach 3 from the left.
  const grid = [
    ['🍒', '🍋', '🍇'],
    ['🍋', '🍇', '🍒'],
    ['🍇', '🍒', '🍋'],
  ];
  const { lines, multiplier } = evaluate(grid);
  assert.strictEqual(lines.length, 0);
  assert.strictEqual(multiplier, 0);
});

test('spin returns a well-formed grid and non-negative multiplier for both modes', () => {
  for (const mode of Object.keys(MODES)) {
    const { grid, multiplier, lines } = spin(mode);
    assert.strictEqual(grid.length, ROWS);
    assert.strictEqual(grid[0].length, MODES[mode].cols);
    assert.ok(multiplier >= 0);
    assert.ok(Array.isArray(lines));
  }
});

test('RTP stays a sustainable house edge (0.80–0.98) for both modes', () => {
  const N = 120_000;
  for (const mode of Object.keys(MODES)) {
    let wins = 0;
    let profit = 0;
    for (let i = 0; i < N; i++) {
      const { multiplier } = spin(mode);
      if (multiplier > 0) {
        wins++;
        profit += multiplier;
      }
    }
    const rtp = wins / N + profit / N; // returned stake on wins + profit paid
    assert.ok(rtp > 0.8 && rtp < 0.98, `${mode} RTP ${rtp.toFixed(3)} out of expected band`);
  }
});
