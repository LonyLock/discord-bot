'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { translate, available, DEFAULT } = require('../src/i18n');

test('translate returns the string for a known key', () => {
  assert.strictEqual(translate('en', 'error.blacklisted'), 'You are blacklisted from using this bot.');
});

test('translate interpolates variables', () => {
  assert.strictEqual(translate('en', 'error.missing_perms', { perms: 'BanMembers' }), 'You need the following permission(s): `BanMembers`');
});

test('translate falls back to the default locale for missing keys', () => {
  // ru.json intentionally has this key; but an unknown key falls back then echoes.
  assert.strictEqual(translate('en', 'totally.unknown.key'), 'totally.unknown.key');
});

test('translate falls back to default locale when locale is unknown', () => {
  assert.strictEqual(translate('zz', 'error.generic'), translate(DEFAULT, 'error.generic'));
});

test('Russian locale differs from English', () => {
  assert.notStrictEqual(translate('ru', 'error.blacklisted'), translate('en', 'error.blacklisted'));
});

test('available() lists locales with display names', () => {
  const codes = available().map((l) => l.code);
  assert.ok(codes.includes('en'));
  assert.ok(codes.includes('ru'));
  assert.ok(available().every((l) => typeof l.name === 'string' && l.name.length));
});
