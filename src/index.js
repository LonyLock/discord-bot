'use strict';

require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  ActivityType,
} = require('discord.js');

const logger = require('./utils/logger');
const { loadCommands, loadEvents } = require('./structures/loaders');
const { validateEnv } = require('./utils/validateEnv');

validateEnv();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.GuildMember,
    Partials.User,
  ],
  allowedMentions: { parse: ['users', 'roles'], repliedUser: false },
  presence: {
    activities: [{ name: '/help • serving your server', type: ActivityType.Watching }],
    status: 'online',
  },
});

// Shared runtime collections / state.
client.commands = new Collection();
client.cooldowns = new Collection();
client.config = require('../config.json');
client.ownerIds = (process.env.OWNER_IDS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
client.startedAt = Date.now();
// Lightweight per-channel automod tracking (in-memory).
client.spamTracker = new Map();
// Per-channel cache of the last deleted message (for /snipe).
client.snipes = new Map();
// Music subsystem (lazy — see music commands). Maps guildId -> queue.
client.musicQueues = new Map();

loadCommands(client);
loadEvents(client);

// Global safety nets so one bad command never crashes the bot.
process.on('unhandledRejection', (reason) => logger.error('Unhandled rejection:', reason));
process.on('uncaughtException', (err) => logger.error('Uncaught exception:', err));

// Graceful shutdown: close the DB and destroy the gateway connection cleanly.
let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.warn(`Received ${signal} — shutting down gracefully…`);
  try {
    const { db } = require('./database/db');
    db.close();
    logger.info('Database connection closed.');
  } catch (err) {
    logger.error('Error closing database:', err.message);
  }
  try {
    client.destroy();
    logger.info('Discord client destroyed.');
  } catch { /* ignore */ }
  setTimeout(() => process.exit(0), 500);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

client.login(process.env.DISCORD_TOKEN).catch((err) => {
  logger.error('Failed to log in:', err.message);
  process.exit(1);
});

module.exports = client;
