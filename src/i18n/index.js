'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { getGuildConfig } = require('../database/db');

const DEFAULT = 'en';
const locales = {};

const dir = path.join(__dirname, 'locales');
for (const file of fs.readdirSync(dir)) {
  if (file.endsWith('.json')) {
    locales[file.slice(0, -5)] = require(path.join(dir, file));
  }
}

/** Translate a key for an explicit locale, interpolating {var} placeholders. */
function translate(locale, key, vars = {}) {
  const table = locales[locale] || locales[DEFAULT];
  let str = table[key];
  if (str === undefined) str = locales[DEFAULT][key];
  if (str === undefined) return key; // missing key — surface it rather than crash
  for (const [k, v] of Object.entries(vars)) str = str.split(`{${k}}`).join(String(v));
  return str;
}

/** Translate using a guild's configured locale (falls back to default). */
function t(guildId, key, vars) {
  const locale = guildId ? getGuildConfig(guildId).locale || DEFAULT : DEFAULT;
  return translate(locale, key, vars);
}

/** [{ code, name }] of installed locales, for menus. */
function available() {
  return Object.keys(locales).map((code) => ({ code, name: locales[code].__name__ || code }));
}

module.exports = { t, translate, available, DEFAULT };
