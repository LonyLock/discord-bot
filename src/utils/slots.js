'use strict';

/**
 * Pure slot-machine engine — no discord.js / no I/O, so the payout maths can be
 * unit-tested and its RTP (return-to-player) simulated. The command layer
 * (commands/economy/slots.js) handles betting, animation and persistence.
 *
 * Two grids are supported and chosen by the player:
 *   '3x3' — 3 reels × 3 rows, 5 paylines (3 rows + 2 diagonals)
 *   '5x3' — 5 reels × 3 rows, 5 paylines (3 rows + 2 V-shaped diagonals)
 *
 * A payline pays on 3+ matching symbols counted from the leftmost reel, exactly
 * like a classic left-to-right slot. Rarer symbols sit less often on the reel
 * strip and pay more; longer matches multiply the win. Constants were tuned by
 * Monte-Carlo simulation to keep RTP a little under 1 (see test/slots.test.js).
 */

// Reel strip: each symbol repeated by its weight. Rarer → fewer copies → bigger payout.
const STRIP = [
  ...Array(8).fill('🍒'),
  ...Array(7).fill('🍋'),
  ...Array(6).fill('🍊'),
  ...Array(5).fill('🍇'),
  ...Array(4).fill('🔔'),
  ...Array(2).fill('💎'),
  ...Array(1).fill('7️⃣'),
];

// Base payout for a 3-of-a-kind of each symbol (multiples of the bet, before the length bonus).
const VALUE = {
  '🍒': 2,
  '🍋': 3,
  '🍊': 4,
  '🍇': 6,
  '🔔': 10,
  '💎': 25,
  '7️⃣': 60,
};

// Length bonus: matching more than the minimum 3 reels multiplies the base payout.
const LENGTH_BONUS = { 3: 1, 4: 4, 5: 12 };

const ROWS = 3;
// `payoutScale` normalises each grid to a comparable ~90% RTP (house edge ~10%):
// the wider 5×3 grid pays far more on raw 4-/5-of-a-kind hits, so it is scaled down,
// while the tighter 3×3 is nudged up. Tuned by Monte-Carlo (see test/slots.test.js).
const MODES = {
  '3x3': { cols: 3, payoutScale: 1.18 },
  '5x3': { cols: 5, payoutScale: 0.62 },
};

/** Build the payline coordinate sets for a given column count. */
function paylines(cols) {
  const lines = [];
  // Horizontal rows.
  for (let r = 0; r < ROWS; r++) {
    lines.push(Array.from({ length: cols }, (_, c) => [r, c]));
  }
  // Two zig-zag diagonals that bounce between the top and bottom rows.
  const down = [];
  const up = [];
  for (let c = 0; c < cols; c++) {
    // A V shape (top-left → middle → …) and its mirror.
    const offset = Math.min(c, cols - 1 - c);
    down.push([Math.min(offset, ROWS - 1), c]);
    up.push([ROWS - 1 - Math.min(offset, ROWS - 1), c]);
  }
  lines.push(down, up);
  return lines;
}

/** Weighted random symbol from the reel strip. Injectable RNG for deterministic tests. */
function spinSymbol(rng = Math.random) {
  return STRIP[Math.floor(rng() * STRIP.length)];
}

/** Produce a full grid[rows][cols] of freshly-spun symbols. */
function spinGrid(cols, rng = Math.random) {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: cols }, () => spinSymbol(rng)));
}

/**
 * Evaluate a grid against its paylines.
 * @returns {{ lines: Array<{symbol:string,count:number,mult:number}>, multiplier:number }}
 *          `multiplier` is the total win as a multiple of the bet (0 = no win).
 */
function evaluate(grid) {
  const cols = grid[0].length;
  const wins = [];
  let multiplier = 0;
  for (const line of paylines(cols)) {
    const first = grid[line[0][0]][line[0][1]];
    let count = 1;
    for (let i = 1; i < line.length; i++) {
      if (grid[line[i][0]][line[i][1]] === first) count++;
      else break;
    }
    if (count >= 3) {
      const mult = VALUE[first] * (LENGTH_BONUS[count] || LENGTH_BONUS[3]);
      wins.push({ symbol: first, count, mult });
      multiplier += mult;
    }
  }
  return { lines: wins, multiplier };
}

/**
 * Spin a mode and evaluate it in one call. The returned `multiplier` already
 * includes the mode's payout scale, so winnings are simply `floor(bet * multiplier)`.
 */
function spin(mode, rng = Math.random) {
  const cfg = MODES[mode] || MODES['3x3'];
  const grid = spinGrid(cfg.cols, rng);
  const raw = evaluate(grid);
  return { grid, lines: raw.multiplier ? raw.lines : [], multiplier: raw.multiplier * cfg.payoutScale };
}

module.exports = {
  STRIP,
  VALUE,
  MODES,
  ROWS,
  paylines,
  spinSymbol,
  spinGrid,
  evaluate,
  spin,
};
