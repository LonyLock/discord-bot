'use strict';

/** Assorted small helpers used across commands. */

/** Clamp a number between min and max. */
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

/** Random integer in [min, max] inclusive. */
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/** Pick a random element from an array. */
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Format a number with thousands separators. */
const formatNumber = (n) => Number(n).toLocaleString('en-US');

/** Shuffle an array (Fisher–Yates), returns a new array. */
function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Truncate a string to n characters with an ellipsis. */
const truncate = (str, n = 1024) =>
  str && str.length > n ? `${str.slice(0, n - 1)}…` : str;

/** A simple async sleep. */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Create a text progress bar. */
function progressBar(current, total, size = 20) {
  const ratio = total === 0 ? 0 : Math.min(current / total, 1);
  const filled = Math.round(size * ratio);
  return '█'.repeat(filled) + '░'.repeat(size - filled);
}

module.exports = { clamp, randInt, pick, formatNumber, shuffle, truncate, sleep, progressBar };
