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

/** Fetch JSON from a URL with a timeout. Returns null on any failure. */
async function fetchJson(url, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      // Some APIs (e.g. Cloudflare-fronted ones) reject undici's default UA.
      headers: { 'User-Agent': 'DiscordBot (https://github.com/lonylock/discord-bot, 1.0.0)' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Create a text progress bar. */
function progressBar(current, total, size = 20) {
  const ratio = total === 0 ? 0 : Math.min(current / total, 1);
  const filled = Math.round(size * ratio);
  return '█'.repeat(filled) + '░'.repeat(size - filled);
}

module.exports = { clamp, randInt, pick, formatNumber, shuffle, truncate, sleep, fetchJson, progressBar };
