'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { combineCommands } = require('../src/structures/combine');

// Synthetic parts: one flat public command, one nested admin command.
function build() {
  const calls = [];
  const flat = {
    data: new SlashCommandBuilder().setName('ping').setDescription('p')
      .addStringOption((o) => o.setName('x').setDescription('x')),
    execute: async () => { calls.push('ping'); },
  };
  const nested = {
    data: new SlashCommandBuilder().setName('mod').setDescription('m')
      .addSubcommand((s) => s.setName('ban').setDescription('b')),
    guildOnly: true,
    permissions: [PermissionFlagsBits.ManageGuild],
    botPermissions: [PermissionFlagsBits.BanMembers],
    execute: async () => { calls.push('mod'); },
    autocomplete: async () => { calls.push('mod:auto'); },
  };
  const combined = combineCommands({ name: 'grp', description: 'd', category: 'c', parts: [flat, nested] });
  return { combined, calls };
}

function mockIx({ group = null, sub, guild = true, member = [], bot = [], user = 'u1' }) {
  const replies = [];
  const ix = {
    guild: guild
      ? { id: 'g', members: { me: { permissions: { missing: (need) => need.filter((p) => !bot.includes(p)) } } } }
      : null,
    user: { id: user },
    memberPermissions: { missing: (need) => need.filter((p) => !member.includes(p)) },
    options: { getSubcommandGroup: () => group, getSubcommand: () => sub },
    reply: async (p) => { replies.push(p); },
  };
  return { ix, replies };
}

const client = { ownerIds: [] };

test('combine: builds one command with a subcommand and a group', () => {
  const { combined } = build();
  const j = combined.data.toJSON();
  assert.strictEqual(j.name, 'grp');
  const byName = Object.fromEntries(j.options.map((o) => [o.name, o.type]));
  assert.strictEqual(byName.ping, 1); // subcommand
  assert.strictEqual(byName.mod, 2); // subcommand group
  assert.ok(combined.autocomplete, 'exposes autocomplete when a part has one');
});

test('combine: routes a flat subcommand to its part', async () => {
  const { combined, calls } = build();
  const { ix } = mockIx({ sub: 'ping' });
  await combined.execute(ix, client);
  assert.deepStrictEqual(calls, ['ping']);
});

test('combine: routes a grouped subcommand to its part when guards pass', async () => {
  const { combined, calls } = build();
  const { ix, replies } = mockIx({
    group: 'mod', sub: 'ban',
    member: [PermissionFlagsBits.ManageGuild],
    bot: [PermissionFlagsBits.BanMembers],
  });
  await combined.execute(ix, client);
  assert.deepStrictEqual(calls, ['mod']);
  assert.strictEqual(replies.length, 0);
});

test('combine: blocks a guild-only part used in DMs', async () => {
  const { combined, calls } = build();
  const { ix, replies } = mockIx({ group: 'mod', sub: 'ban', guild: false });
  await combined.execute(ix, client);
  assert.deepStrictEqual(calls, []);
  assert.strictEqual(replies.length, 1);
});

test('combine: blocks a part when the member lacks permissions', async () => {
  const { combined, calls } = build();
  const { ix, replies } = mockIx({ group: 'mod', sub: 'ban', member: [], bot: [PermissionFlagsBits.BanMembers] });
  await combined.execute(ix, client);
  assert.deepStrictEqual(calls, []);
  assert.strictEqual(replies.length, 1);
});

test('combine: owner bypasses the permission gate', async () => {
  const { combined, calls } = build();
  const { ix } = mockIx({ group: 'mod', sub: 'ban', member: [], bot: [PermissionFlagsBits.BanMembers], user: 'owner' });
  await combined.execute(ix, { ownerIds: ['owner'] });
  assert.deepStrictEqual(calls, ['mod']);
});

test('combine: autocomplete routes to the matching part', async () => {
  const { combined, calls } = build();
  const { ix } = mockIx({ group: 'mod', sub: 'ban' });
  await combined.autocomplete(ix, client);
  assert.deepStrictEqual(calls, ['mod:auto']);
});
