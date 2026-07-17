#!/usr/bin/env node
'use strict';

/**
 * Create (or remove) the moderation role ladder on a server directly, without
 * running the whole bot or re-deploying slash commands.
 *
 *   node scripts/create-modroles.js <guildId> [5|6]     # create (default 6 tiers)
 *   node scripts/create-modroles.js <guildId> --remove  # delete the ladder roles
 *
 * Uses DISCORD_TOKEN from your .env. The bot must already be in the guild with
 * the "Manage Roles" permission and a role high enough to create the new roles.
 */

require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { createLadder, removeLadder } = require('../src/services/modladder');

const guildId = process.argv[2] || process.env.GUILD_ID;
const remove = process.argv.includes('--remove');
const tiers = process.argv.includes('5') ? 5 : 6;

if (!process.env.DISCORD_TOKEN) {
  console.error('✗ DISCORD_TOKEN is missing from your environment / .env');
  process.exit(1);
}
if (!guildId) {
  console.error('Usage: node scripts/create-modroles.js <guildId> [5|6] [--remove]');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('clientReady', run);
client.once('ready', run); // fallback for older discord.js event name

let done = false;
async function run() {
  if (done) return;
  done = true;
  try {
    const guild = await client.guilds.fetch(guildId);
    await guild.members.fetchMe();
    await guild.roles.fetch();

    if (remove) {
      const { deleted } = await removeLadder(guild, 'create-modroles.js --remove');
      console.log(`✓ Deleted ${deleted.length} role(s): ${deleted.join(', ') || '—'}`);
    } else {
      const { created, skipped, failed, dropped } = await createLadder(guild, tiers, 'create-modroles.js');
      console.log(`✓ Created ${created.length} role(s): ${created.map((r) => r.name).join(', ') || '—'}`);
      if (skipped.length) console.log(`• Skipped (already exist): ${skipped.map((r) => r.name).join(', ')}`);
      if (failed.length) console.log(`✗ Failed: ${failed.join(', ')}`);
      if (dropped.length) console.log(`⚠ Not granted (bot's role lacks them): ${dropped.join(', ')}`);
    }
  } catch (err) {
    console.error('✗ Error:', err.message);
    process.exitCode = 1;
  } finally {
    client.destroy();
  }
}

client.login(process.env.DISCORD_TOKEN).catch((err) => {
  console.error('✗ Login failed:', err.message);
  process.exit(1);
});
