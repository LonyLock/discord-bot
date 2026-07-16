'use strict';

/**
 * Renders a PNG rank card with @napi-rs/canvas. Loaded lazily so the bot still
 * runs if the (optional) native canvas dependency is unavailable — in that
 * case isAvailable() is false and the rank command falls back to an embed.
 */

let canvasLib = null;
let available = false;
try {
  canvasLib = require('@napi-rs/canvas');
  available = true;
} catch {
  available = false;
}

const { formatNumber } = require('../utils/helpers');

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function generate({ username, avatarURL, level, rank, xp, needed, accent = '#5865F2' }) {
  if (!available) return null;
  const { createCanvas, loadImage } = canvasLib;
  const W = 934;
  const H = 282;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Background.
  ctx.fillStyle = '#0f1117';
  roundRect(ctx, 0, 0, W, H, 30);
  ctx.fill();
  ctx.fillStyle = '#1a1e27';
  roundRect(ctx, 16, 16, W - 32, H - 32, 22);
  ctx.fill();

  // Avatar (circular). Falls back to a solid circle if it can't be fetched.
  const cx = 141;
  const cy = 141;
  const rad = 90;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  try {
    const res = await fetch(avatarURL);
    const buf = Buffer.from(await res.arrayBuffer());
    const img = await loadImage(buf);
    ctx.drawImage(img, cx - rad, cy - rad, rad * 2, rad * 2);
  } catch {
    ctx.fillStyle = accent;
    ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  }
  ctx.restore();
  // Avatar ring.
  ctx.strokeStyle = accent;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.stroke();

  // Username.
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText(truncateText(ctx, username, 480), 270, 120);

  // Level / rank (right aligned).
  ctx.textAlign = 'right';
  ctx.fillStyle = accent;
  ctx.font = 'bold 42px sans-serif';
  ctx.fillText(`LVL ${level}`, W - 50, 90);
  ctx.fillStyle = '#b6bac2';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(`RANK #${rank}`, W - 50, 130);
  ctx.textAlign = 'left';

  // XP text.
  ctx.fillStyle = '#b6bac2';
  ctx.font = '26px sans-serif';
  ctx.fillText(`${formatNumber(xp)} / ${formatNumber(needed)} XP`, 270, 175);

  // Progress bar.
  const barX = 270;
  const barY = 200;
  const barW = W - barX - 50;
  const barH = 38;
  const ratio = needed > 0 ? Math.max(0, Math.min(1, xp / needed)) : 0;
  ctx.fillStyle = '#2c313c';
  roundRect(ctx, barX, barY, barW, barH, barH / 2);
  ctx.fill();
  if (ratio > 0) {
    ctx.fillStyle = accent;
    roundRect(ctx, barX, barY, Math.max(barH, barW * ratio), barH, barH / 2);
    ctx.fill();
  }

  return canvas.toBuffer('image/png');
}

function truncateText(ctx, text, maxWidth) {
  let str = text;
  while (str.length > 1 && ctx.measureText(str).width > maxWidth) str = str.slice(0, -1);
  return str === text ? text : `${str}…`;
}

module.exports = { isAvailable: () => available, generate };
