'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { isInvite, isLink, isExcessiveCaps } = require('../src/utils/patterns');

test('isInvite detects Discord invite links', () => {
  assert.ok(isInvite('join here discord.gg/abc123'));
  assert.ok(isInvite('https://discord.com/invite/xyz'));
  assert.ok(isInvite('discordapp.com/invite/foo'));
  assert.ok(isInvite('DISCORD.GG/UPPER'));
});

test('isInvite ignores non-invite text', () => {
  assert.strictEqual(isInvite('just talking about discord'), false);
  assert.strictEqual(isInvite('discord.gg'), false); // no invite code
  assert.strictEqual(isInvite(''), false);
  assert.strictEqual(isInvite(null), false);
});

test('isLink detects http/https URLs', () => {
  assert.ok(isLink('check http://example.com'));
  assert.ok(isLink('secure https://example.com/path?x=1'));
});

test('isLink ignores plain text', () => {
  assert.strictEqual(isLink('example.com'), false); // no scheme
  assert.strictEqual(isLink('no links here'), false);
  assert.strictEqual(isLink(''), false);
});

test('isExcessiveCaps flags shouting', () => {
  assert.ok(isExcessiveCaps('THIS IS ALL CAPS SHOUTING'));
  assert.ok(isExcessiveCaps('EVERYONE LISTEN UP RIGHT NOW'));
});

test('isExcessiveCaps ignores normal and short messages', () => {
  assert.strictEqual(isExcessiveCaps('This is a normal sentence.'), false);
  assert.strictEqual(isExcessiveCaps('OK'), false); // too short
  assert.strictEqual(isExcessiveCaps('LOL'), false); // under min length
  assert.strictEqual(isExcessiveCaps(''), false);
  assert.strictEqual(isExcessiveCaps('Hello there, how are you doing today?'), false);
});
