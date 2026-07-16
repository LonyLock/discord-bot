'use strict';

/**
 * Renders an animated GIF of a slot spin with @napi-rs/canvas + gifenc.
 *
 * Loaded lazily and fully optional: if the native canvas, the GIF encoder, or a
 * color-emoji font are missing, isAvailable() is false and the /slots command
 * falls back to its text (edit-frame) animation. Nothing here is on the hot path
 * until a spin actually requests a GIF.
 */

let canvasLib = null;
let gifenc = null;
let emojiFont = null;
let available = false;
try {
  canvasLib = require('@napi-rs/canvas');
  gifenc = require('gifenc');
  // A color-emoji font must be resolvable or the reels render as blank tiles.
  const fams = (canvasLib.GlobalFonts.families || []).map((f) => f.family);
  emojiFont = fams.find((n) => /emoji/i.test(n)) || null;
  available = Boolean(emojiFont);
} catch {
  available = false;
}

const { spinSymbol } = require('../utils/slots');

// Layout constants (pixels).
const TILE = 92;
const GAP = 10;
const PAD = 22;
const ROWS = 3;

// Animation constants.
const FPS_DELAY = 55; // ms per frame
const SCROLL_PX = 46; // reel travel per frame while spinning
const SPIN_FRAMES = 12; // frames every column spins before any locks
const STAGGER = 4; // extra spinning frames per column before it locks
const HOLD_FRAMES = 16; // frames to hold the final result

const BG = '#12151d';
const PANEL = '#1c2130';
const TILE_BG = '#0e111a';
const TILE_EDGE = '#2b3145';
const WIN_EDGE = '#f1c40f';
const LOCK_FLASH = '#ffffff';

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
  const W = PAD * 2 + cols * TILE + (cols - 1) * GAP;
  const gridH = ROWS * TILE + (ROWS - 1) * GAP;
  const H = PAD * 2 + gridH;
  const gridTop = PAD;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const symFont = `${Math.round(TILE * 0.62)}px "${emojiFont}"`;

  // Per-column reel strips of random symbols scrolled during the spin. The final
  // three entries are pinned to the target grid so the lock lands seamlessly.
  const STRIP_LEN = 24;
  const strips = [];
  for (let c = 0; c < cols; c++) {
    const strip = Array.from({ length: STRIP_LEN }, () => spinSymbol());
    for (let r = 0; r < ROWS; r++) strip[STRIP_LEN - ROWS + r] = grid[r][c];
    strips.push(strip);
  }
  const lockFrame = (c) => SPIN_FRAMES + c * STAGGER;
  const totalSpin = lockFrame(cols - 1) + 1;
  const totalFrames = totalSpin + HOLD_FRAMES;

  const colX = (c) => PAD + c * (TILE + GAP);
  const rowY = (r) => gridTop + r * (TILE + GAP);

  function tile(x, y, symbol, edge, lineWidth) {
    ctx.fillStyle = TILE_BG;
    roundRect(ctx, x, y, TILE, TILE, 14);
    ctx.fill();
    if (symbol) {
      ctx.font = symFont;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(symbol, x + TILE / 2, y + TILE / 2 + 2);
    }
    ctx.strokeStyle = edge;
    ctx.lineWidth = lineWidth;
    roundRect(ctx, x, y, TILE, TILE, 14);
    ctx.stroke();
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
      const locked = f >= lockFrame(c);
      // Clip to the column's visible 3-row viewport so scrolling symbols don't bleed.
      ctx.save();
      roundRect(ctx, colX(c), gridTop, TILE, gridH, 14);
      ctx.clip();

      if (!locked) {
        // Scroll the strip upward; draw an extra tile above/below for smoothness.
        const travel = f * SCROLL_PX;
        const base = Math.floor(travel / (TILE + GAP));
        const off = travel % (TILE + GAP);
        for (let r = -1; r <= ROWS; r++) {
          const sym = strips[c][((base + r) % STRIP_LEN + STRIP_LEN) % STRIP_LEN];
          tile(colX(c), rowY(r) - off, sym, TILE_EDGE, 2);
        }
      } else {
        for (let r = 0; r < ROWS; r++) {
          const justLocked = f < lockFrame(c) + 2;
          const win = held && winSet.has(`${r},${c}`);
          const edge = justLocked ? LOCK_FLASH : win ? WIN_EDGE : TILE_EDGE;
          tile(colX(c), rowY(r), grid[r][c], edge, win || justLocked ? 4 : 2);
        }
      }
      ctx.restore();
    }

    // Pulsing highlight ring on winning cells during the hold.
    if (held && winSet.size) {
      const pulse = 2 + Math.abs(((f - totalSpin) % 8) - 4);
      ctx.strokeStyle = WIN_EDGE;
      ctx.lineWidth = pulse;
      for (const key of winSet) {
        const [r, c] = key.split(',').map(Number);
        roundRect(ctx, colX(c), rowY(r), TILE, TILE, 14);
        ctx.stroke();
      }
    }

    const data = ctx.getImageData(0, 0, W, H).data;
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    // First frame declares repeat: -1 = play once and hold (no looping re-spin).
    enc.writeFrame(index, W, H, {
      palette,
      delay: held ? FPS_DELAY + 25 : FPS_DELAY,
      repeat: f === 0 ? -1 : undefined,
    });
  }

  enc.finish();
  return Buffer.from(enc.bytes());
}

module.exports = { isAvailable: () => available, generate };
