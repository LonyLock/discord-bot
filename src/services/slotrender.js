'use strict';

/**
 * Renders an animated GIF of a slot spin with @napi-rs/canvas + gifenc, using
 * hand-drawn vector symbols (src/services/slotsymbols.js) so no emoji font is
 * needed. Reels spin as continuous strips, decelerate with easing + motion blur,
 * lock in left→right, then the winning line pulses and the final frame holds.
 * The GIF plays once (no looping re-spin).
 *
 * Fully optional and lazily loaded, like the rank card: if the native canvas or
 * the GIF encoder are missing, isAvailable() is false and /slots falls back to
 * its text (edit-frame) animation.
 */

let canvasLib = null;
let gifenc = null;
let symbols = null;
let available = false;
try {
  canvasLib = require('@napi-rs/canvas');
  gifenc = require('gifenc');
  symbols = require('./slotsymbols');
  available = true;
} catch {
  available = false;
}

const { spinSymbol } = require('../utils/slots');

// Layout (pixels).
const TILE = 92;
const GAP = 10;
const CELL = TILE + GAP;
const PAD = 22;
const ROWS = 3;
const SYM = TILE * 0.32; // symbol radius

// Animation.
const FPS_DELAY = 45; // ms per spinning frame
const HOLD_DELAY = 90; // ms per held frame
const SPIN_MIN = 15; // frames the first reel spins before stopping
const STAGGER = 4; // extra spinning frames per subsequent reel
const LOOPS = 6; // full strip revolutions before landing (spin length)
const HOLD_FRAMES = 14;
const STRIP_LEN = 20;

const BG = '#12151d';
const PANEL = '#1c2130';
const REEL_BG = '#0b0e15';
const SEP = 'rgba(255,255,255,0.05)';
const WIN_EDGE = '#f1c40f';
const LOCK_FLASH = '#ffffff';

const easeOutQuart = (p) => 1 - Math.pow(1 - p, 4);

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * @param {Object} opts
 * @param {string[][]} opts.grid   Final grid[row][col] of symbols.
 * @param {Array<[number,number]>} [opts.winCells]  Cells to highlight on the hold frames.
 * @param {string} [opts.accent]   Panel accent colour.
 * @returns {Promise<Buffer|null>} GIF buffer, or null if rendering is unavailable.
 */
async function generate({ grid, winCells = [], accent = '#5865F2' }) {
  if (!available) return null;
  const { createCanvas } = canvasLib;
  const { GIFEncoder, quantize, applyPalette } = gifenc;

  const cols = grid[0].length;
  const gridH = ROWS * CELL - GAP;
  const W = PAD * 2 + cols * CELL - GAP;
  const H = PAD * 2 + gridH;
  const gridTop = PAD;
  const colX = (c) => PAD + c * CELL;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Per-column reel strips; the final ROWS entries are pinned to the target grid
  // so the reel lands exactly on the resolved outcome.
  const strips = [];
  for (let c = 0; c < cols; c++) {
    const strip = Array.from({ length: STRIP_LEN }, () => spinSymbol());
    for (let r = 0; r < ROWS; r++) strip[STRIP_LEN - ROWS + r] = grid[r][c];
    strips.push(strip);
  }
  const stopFrame = (c) => SPIN_MIN + c * STAGGER;
  const travel = LOOPS * STRIP_LEN + (STRIP_LEN - ROWS); // integer → lands with zero offset
  const totalSpin = stopFrame(cols - 1) + 1;
  const totalFrames = totalSpin + HOLD_FRAMES;

  // Reel position (in cell units) for column c at frame f, and previous frame (for blur).
  function posAt(c, f) {
    const stop = stopFrame(c);
    if (f >= stop) return travel;
    return easeOutQuart(f / stop) * travel;
  }

  function drawSymbolAt(sym, cx, cy, alpha) {
    if (alpha < 1) ctx.globalAlpha = alpha;
    symbols.draw(ctx, sym, cx, cy, SYM);
    ctx.globalAlpha = 1;
  }

  const enc = GIFEncoder();
  const winSet = new Set(winCells.map(([r, c]) => `${r},${c}`));

  for (let f = 0; f < totalFrames; f++) {
    // Backdrop + panel.
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = PANEL;
    roundRect(ctx, 6, 6, W - 12, H - 12, 18);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    roundRect(ctx, 6, 6, W - 12, H - 12, 18);
    ctx.stroke();

    const held = f >= totalSpin;

    for (let c = 0; c < cols; c++) {
      const x = colX(c);
      // Reel background.
      ctx.fillStyle = REEL_BG;
      roundRect(ctx, x, gridTop, TILE, gridH, 14);
      ctx.fill();

      ctx.save();
      roundRect(ctx, x, gridTop, TILE, gridH, 14);
      ctx.clip();

      const u = posAt(c, f);
      const speed = u - posAt(c, f - 1); // cells/frame, for motion blur
      const base = Math.floor(u);
      const off = (u - base) * CELL;
      const cxCol = x + TILE / 2;

      for (let r = -1; r <= ROWS; r++) {
        const idx = ((base + r) % STRIP_LEN + STRIP_LEN) % STRIP_LEN;
        const sym = strips[c][idx];
        const cy = gridTop + r * CELL + TILE / 2 - off;
        if (speed > 1.2) {
          // Motion blur: faint trailing ghosts above and below.
          drawSymbolAt(sym, cxCol, cy - CELL * 0.33, 0.22);
          drawSymbolAt(sym, cxCol, cy + CELL * 0.33, 0.22);
          drawSymbolAt(sym, cxCol, cy, 0.8);
        } else {
          drawSymbolAt(sym, cxCol, cy, 1);
        }
      }
      ctx.restore();

      // Row separators.
      ctx.strokeStyle = SEP;
      ctx.lineWidth = 1;
      for (let r = 1; r < ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(x, gridTop + r * CELL - GAP / 2);
        ctx.lineTo(x + TILE, gridTop + r * CELL - GAP / 2);
        ctx.stroke();
      }

      // Brief white flash the moment a reel locks.
      if (f >= stopFrame(c) && f < stopFrame(c) + 2) {
        ctx.strokeStyle = LOCK_FLASH;
        ctx.lineWidth = 4;
        roundRect(ctx, x, gridTop, TILE, gridH, 14);
        ctx.stroke();
      }
    }

    // Pulsing highlight on winning cells during the hold.
    if (held && winSet.size) {
      const pulse = 3 + Math.abs(((f - totalSpin) % 8) - 4);
      ctx.strokeStyle = WIN_EDGE;
      ctx.lineWidth = pulse;
      for (const key of winSet) {
        const [r, c] = key.split(',').map(Number);
        roundRect(ctx, colX(c), gridTop + r * CELL, TILE, TILE, 12);
        ctx.stroke();
      }
    }

    const data = ctx.getImageData(0, 0, W, H).data;
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    // First frame declares repeat: -1 = play once and hold (no looping re-spin).
    enc.writeFrame(index, W, H, {
      palette,
      delay: held ? HOLD_DELAY : FPS_DELAY,
      repeat: f === 0 ? -1 : undefined,
    });
  }

  enc.finish();
  return Buffer.from(enc.bytes());
}

module.exports = { isAvailable: () => available, generate };
