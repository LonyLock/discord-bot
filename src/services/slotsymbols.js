'use strict';

/**
 * Pure canvas vector art for the slot symbols — no emoji font required, so the
 * GIF renderer works on any host with @napi-rs/canvas. Each drawer paints one
 * symbol centred at (cx, cy), sized to roughly 2·s across, on the current ctx.
 *
 * Symbol identities match the engine's reel strip (src/utils/slots.js), keyed by
 * the same emoji so the text-fallback animation and the GIF stay in sync.
 */

function radial(ctx, cx, cy, r, stops) {
  const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
  for (const [at, col] of stops) g.addColorStop(at, col);
  return g;
}

function linear(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [at, col] of stops) g.addColorStop(at, col);
  return g;
}

function ball(ctx, cx, cy, r, light, dark, edge) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = radial(ctx, cx, cy, r, [[0, light], [0.6, dark], [1, edge]]);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.stroke();
  // Glossy highlight.
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.35, cy - r * 0.4, r * 0.28, r * 0.18, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fill();
}

function cherry(ctx, cx, cy, s) {
  const topX = cx + s * 0.15;
  const topY = cy - s * 0.85;
  // Stems.
  ctx.strokeStyle = '#3f8b32';
  ctx.lineWidth = s * 0.13;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(topX, topY);
  ctx.quadraticCurveTo(cx - s * 0.5, cy - s * 0.1, cx - s * 0.45, cy + s * 0.15);
  ctx.moveTo(topX, topY);
  ctx.quadraticCurveTo(cx + s * 0.6, cy - s * 0.05, cx + s * 0.5, cy + s * 0.28);
  ctx.stroke();
  // Leaf.
  ctx.beginPath();
  ctx.ellipse(topX + s * 0.32, topY - s * 0.02, s * 0.32, s * 0.15, -0.6, 0, Math.PI * 2);
  ctx.fillStyle = '#4faa3c';
  ctx.fill();
  // Two cherries.
  ball(ctx, cx - s * 0.45, cy + s * 0.5, s * 0.42, '#ff7b84', '#e01f2b', '#8f0f18');
  ball(ctx, cx + s * 0.5, cy + s * 0.6, s * 0.4, '#ff7b84', '#e01f2b', '#8f0f18');
}

function lemon(ctx, cx, cy, s) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.5);
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.95, s * 0.62, 0, 0, Math.PI * 2);
  ctx.fillStyle = radial(ctx, -s * 0.2, -s * 0.2, s, [[0, '#fff6b0'], [0.6, '#f6d21a'], [1, '#d9a406']]);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,90,0,0.4)';
  ctx.lineWidth = s * 0.06;
  ctx.stroke();
  // End nubs.
  ctx.fillStyle = '#e7b90c';
  for (const nx of [-s * 0.95, s * 0.95]) {
    ctx.beginPath();
    ctx.ellipse(nx, 0, s * 0.1, s * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(-s * 0.3, -s * 0.25, s * 0.3, s * 0.14, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fill();
  ctx.restore();
}

function grape(ctx, cx, cy, s) {
  // Stem + leaf.
  ctx.strokeStyle = '#6b4a2b';
  ctx.lineWidth = s * 0.12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.95);
  ctx.lineTo(cx, cy - s * 0.55);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx + s * 0.3, cy - s * 0.85, s * 0.28, s * 0.13, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = '#4faa3c';
  ctx.fill();
  // Cluster (triangle of berries).
  const r = s * 0.3;
  const rows = [
    [-0.6, -0.5],
    [0, -0.5],
    [0.6, -0.5],
    [-0.3, 0.05],
    [0.3, 0.05],
    [-0.6, 0.05],
    [0.6, 0.05],
    [0, 0.6],
    [-0.3, 0.6],
    [0.3, 0.6],
  ];
  for (const [dx, dy] of rows) {
    ball(ctx, cx + dx * s, cy + dy * s + s * 0.15, r, '#c79be6', '#7d3fb0', '#4c2270');
  }
}

function bell(ctx, cx, cy, s) {
  ctx.save();
  ctx.translate(cx, cy - s * 0.1);
  // Body.
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.85);
  ctx.quadraticCurveTo(s * 0.75, -s * 0.7, s * 0.8, s * 0.35);
  ctx.quadraticCurveTo(s * 0.85, s * 0.5, s * 0.95, s * 0.55);
  ctx.lineTo(-s * 0.95, s * 0.55);
  ctx.quadraticCurveTo(-s * 0.85, s * 0.5, -s * 0.8, s * 0.35);
  ctx.quadraticCurveTo(-s * 0.75, -s * 0.7, 0, -s * 0.85);
  ctx.closePath();
  ctx.fillStyle = radial(ctx, -s * 0.2, -s * 0.3, s * 1.2, [[0, '#fff3bf'], [0.55, '#f5c518'], [1, '#c8860a']]);
  ctx.fill();
  ctx.strokeStyle = '#9a6a06';
  ctx.lineWidth = s * 0.06;
  ctx.stroke();
  // Top knob.
  ctx.beginPath();
  ctx.arc(0, -s * 0.92, s * 0.14, 0, Math.PI * 2);
  ctx.fillStyle = '#e0a812';
  ctx.fill();
  // Rim.
  ctx.beginPath();
  ctx.moveTo(-s * 0.95, s * 0.55);
  ctx.lineTo(s * 0.95, s * 0.55);
  ctx.lineTo(s * 0.8, s * 0.78);
  ctx.lineTo(-s * 0.8, s * 0.78);
  ctx.closePath();
  ctx.fillStyle = '#e0a812';
  ctx.fill();
  // Clapper.
  ctx.beginPath();
  ctx.arc(0, s * 0.92, s * 0.16, 0, Math.PI * 2);
  ctx.fillStyle = '#b5820a';
  ctx.fill();
  // Shine.
  ctx.beginPath();
  ctx.ellipse(-s * 0.32, -s * 0.15, s * 0.14, s * 0.4, -0.15, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fill();
  ctx.restore();
}

function diamond(ctx, cx, cy, s) {
  const topY = cy - s * 0.6;
  const midY = cy - s * 0.2;
  const botY = cy + s * 0.85;
  const halfW = s * 0.8;
  const tableW = s * 0.42;
  // Facets.
  const facets = [
    { pts: [[-tableW, topY], [tableW, topY], [halfW * 0.55, midY], [-halfW * 0.55, midY]], c: '#cdeeff' },
    { pts: [[-tableW, topY], [-halfW * 0.55, midY], [-halfW, midY]], c: '#7fc6ef' },
    { pts: [[tableW, topY], [halfW * 0.55, midY], [halfW, midY]], c: '#7fc6ef' },
    { pts: [[-halfW, midY], [-halfW * 0.55, midY], [0, botY]], c: '#4aa3dd' },
    { pts: [[-halfW * 0.55, midY], [halfW * 0.55, midY], [0, botY]], c: '#67b6e8' },
    { pts: [[halfW * 0.55, midY], [halfW, midY], [0, botY]], c: '#3f93d0' },
  ];
  for (const f of facets) {
    ctx.beginPath();
    ctx.moveTo(cx + f.pts[0][0], f.pts[0][1]);
    for (let i = 1; i < f.pts.length; i++) ctx.lineTo(cx + f.pts[i][0], f.pts[i][1]);
    ctx.closePath();
    ctx.fillStyle = f.c;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = s * 0.03;
    ctx.stroke();
  }
  // Sparkle.
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(cx - s * 0.2, topY + s * 0.14, s * 0.06, 0, Math.PI * 2);
  ctx.fill();
}

function seven(ctx, cx, cy, s) {
  // Bold blocky "7" polygon.
  const pts = [
    [-0.62, -0.72], [0.62, -0.72], [0.62, -0.42], [0.12, 0.78],
    [-0.28, 0.78], [0.24, -0.42], [-0.62, -0.42],
  ];
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx + pts[0][0] * s, cy + pts[0][1] * s);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(cx + pts[i][0] * s, cy + pts[i][1] * s);
  ctx.closePath();
  ctx.fillStyle = linear(ctx, cx, cy - s, cx, cy + s, [[0, '#ff5a5f'], [0.5, '#e01f2b'], [1, '#9f0f18']]);
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#ffd24a';
  ctx.lineWidth = s * 0.12;
  ctx.stroke();
  // Inner shine on the top bar.
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.5, cy - s * 0.63);
  ctx.lineTo(cx + s * 0.5, cy - s * 0.63);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = s * 0.08;
  ctx.stroke();
  ctx.restore();
}

const DRAW = {
  '🍒': cherry,
  '🍋': lemon,
  '🍇': grape,
  '🔔': bell,
  '💎': diamond,
  '7️⃣': seven,
};

/** Draw a symbol by its emoji key. No-ops for unknown keys. */
function draw(ctx, symbol, cx, cy, s) {
  const fn = DRAW[symbol];
  if (fn) fn(ctx, cx, cy, s);
}

module.exports = { draw, SYMBOLS: Object.keys(DRAW) };
