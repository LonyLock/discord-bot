'use strict';

/**
 * Parse a human duration string ("10m", "1h30m", "2d", "1w") into milliseconds.
 * Returns null when nothing valid is found.
 */
function parseDuration(input) {
  if (!input) return null;
  const regex = /(\d+)\s*(w|weeks?|d|days?|h|hours?|m|mins?|minutes?|s|secs?|seconds?)/gi;
  const units = {
    w: 6048e5, week: 6048e5, weeks: 6048e5,
    d: 864e5, day: 864e5, days: 864e5,
    h: 36e5, hour: 36e5, hours: 36e5,
    m: 6e4, min: 6e4, mins: 6e4, minute: 6e4, minutes: 6e4,
    s: 1e3, sec: 1e3, secs: 1e3, second: 1e3, seconds: 1e3,
  };
  let total = 0;
  let match;
  let found = false;
  while ((match = regex.exec(input)) !== null) {
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const factor = units[unit] ?? units[unit[0]];
    if (factor) {
      total += value * factor;
      found = true;
    }
  }
  return found ? total : null;
}

/** Format milliseconds into a compact human string e.g. "1d 2h 3m". */
function formatDuration(ms) {
  if (ms < 1000) return '0s';
  const units = [
    ['w', 6048e5],
    ['d', 864e5],
    ['h', 36e5],
    ['m', 6e4],
    ['s', 1e3],
  ];
  const parts = [];
  let remaining = ms;
  for (const [label, factor] of units) {
    const amount = Math.floor(remaining / factor);
    if (amount > 0) {
      parts.push(`${amount}${label}`);
      remaining -= amount * factor;
    }
  }
  return parts.slice(0, 3).join(' ') || '0s';
}

/** Discord relative timestamp e.g. <t:123:R> */
function relative(ms) {
  return `<t:${Math.floor(ms / 1000)}:R>`;
}

/** Discord full timestamp e.g. <t:123:F> */
function fullTimestamp(ms) {
  return `<t:${Math.floor(ms / 1000)}:F>`;
}

module.exports = { parseDuration, formatDuration, relative, fullTimestamp };
