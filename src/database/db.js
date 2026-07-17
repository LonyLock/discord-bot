'use strict';

/**
 * Central SQLite database layer.
 *
 * Uses better-sqlite3 (synchronous, fast, zero external services) so the bot
 * is fully self-contained and works on any internal/offline project.
 *
 * Every feature stores its state through the helpers exported here.
 */

const path = require('node:path');
const fs = require('node:fs');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'bot.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/* ------------------------------------------------------------------ */
/*  Schema                                                            */
/* ------------------------------------------------------------------ */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS guild_config (
  guild_id            TEXT PRIMARY KEY,
  prefix              TEXT,
  mod_log_channel     TEXT,
  message_log_channel TEXT,
  join_log_channel    TEXT,
  welcome_channel     TEXT,
  welcome_message     TEXT,
  welcome_enabled     INTEGER DEFAULT 0,
  goodbye_channel     TEXT,
  goodbye_message     TEXT,
  goodbye_enabled     INTEGER DEFAULT 0,
  autorole            TEXT,
  mute_role           TEXT,
  level_up_channel    TEXT,
  level_up_message    TEXT,
  leveling_enabled    INTEGER DEFAULT 1,
  level_up_enabled    INTEGER DEFAULT 1,
  economy_enabled     INTEGER DEFAULT 1,
  starboard_channel   TEXT,
  starboard_threshold INTEGER DEFAULT 3,
  starboard_emoji     TEXT DEFAULT '⭐',
  suggestion_channel  TEXT,
  ticket_category     TEXT,
  ticket_log_channel  TEXT,
  ticket_support_role TEXT,
  automod_enabled     INTEGER DEFAULT 0,
  automod_anti_spam   INTEGER DEFAULT 0,
  automod_anti_invite INTEGER DEFAULT 0,
  automod_anti_link   INTEGER DEFAULT 0,
  automod_anti_mention INTEGER DEFAULT 0,
  automod_anti_caps   INTEGER DEFAULT 0,
  automod_badwords    INTEGER DEFAULT 0,
  server_log_channel  TEXT,
  antiraid_enabled    INTEGER DEFAULT 0,
  antiraid_min_age_days INTEGER DEFAULT 0,
  antiraid_action     TEXT DEFAULT 'kick',
  antiraid_join_threshold INTEGER DEFAULT 0,
  verify_role         TEXT,
  locale              TEXT DEFAULT 'en'
);

CREATE TABLE IF NOT EXISTS levels (
  guild_id     TEXT NOT NULL,
  user_id      TEXT NOT NULL,
  xp           INTEGER DEFAULT 0,
  level        INTEGER DEFAULT 0,
  total_xp     INTEGER DEFAULT 0,
  last_message INTEGER DEFAULT 0,
  PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS level_roles (
  guild_id TEXT NOT NULL,
  level    INTEGER NOT NULL,
  role_id  TEXT NOT NULL,
  PRIMARY KEY (guild_id, level)
);

CREATE TABLE IF NOT EXISTS economy (
  guild_id    TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  wallet      INTEGER DEFAULT 0,
  bank        INTEGER DEFAULT 0,
  last_daily  INTEGER DEFAULT 0,
  last_weekly INTEGER DEFAULT 0,
  last_work   INTEGER DEFAULT 0,
  last_rob    INTEGER DEFAULT 0,
  last_crime  INTEGER DEFAULT 0,
  streak      INTEGER DEFAULT 0,
  PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS shop_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id    TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  price       INTEGER NOT NULL,
  role_id     TEXT,
  stock       INTEGER DEFAULT -1
);

CREATE TABLE IF NOT EXISTS inventory (
  guild_id TEXT NOT NULL,
  user_id  TEXT NOT NULL,
  item_id  INTEGER NOT NULL,
  amount   INTEGER DEFAULT 1,
  PRIMARY KEY (guild_id, user_id, item_id)
);

CREATE TABLE IF NOT EXISTS warnings (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id      TEXT NOT NULL,
  user_id       TEXT NOT NULL,
  moderator_id  TEXT NOT NULL,
  reason        TEXT,
  timestamp     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS modlogs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id     TEXT NOT NULL,
  user_id      TEXT NOT NULL,
  moderator_id TEXT NOT NULL,
  action       TEXT NOT NULL,
  reason       TEXT,
  timestamp    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reaction_roles (
  guild_id   TEXT NOT NULL,
  message_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  emoji      TEXT NOT NULL,
  role_id    TEXT NOT NULL,
  PRIMARY KEY (message_id, emoji)
);

CREATE TABLE IF NOT EXISTS tags (
  guild_id  TEXT NOT NULL,
  name      TEXT NOT NULL,
  content   TEXT NOT NULL,
  author_id TEXT NOT NULL,
  uses      INTEGER DEFAULT 0,
  created   INTEGER NOT NULL,
  PRIMARY KEY (guild_id, name)
);

CREATE TABLE IF NOT EXISTS afk (
  user_id   TEXT PRIMARY KEY,
  guild_id  TEXT NOT NULL,
  reason    TEXT,
  timestamp INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reminders (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  guild_id   TEXT,
  message    TEXT NOT NULL,
  remind_at  INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS giveaways (
  message_id  TEXT PRIMARY KEY,
  channel_id  TEXT NOT NULL,
  guild_id    TEXT NOT NULL,
  prize       TEXT NOT NULL,
  winners     INTEGER DEFAULT 1,
  host_id     TEXT NOT NULL,
  end_at      INTEGER NOT NULL,
  ended       INTEGER DEFAULT 0,
  required_role TEXT,
  required_level INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS giveaway_entries (
  message_id TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  PRIMARY KEY (message_id, user_id)
);

CREATE TABLE IF NOT EXISTS tickets (
  channel_id TEXT PRIMARY KEY,
  guild_id   TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  subject    TEXT,
  status     TEXT DEFAULT 'open',
  created_at INTEGER NOT NULL,
  number     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS ticket_counter (
  guild_id TEXT PRIMARY KEY,
  counter  INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS starboard (
  original_id  TEXT PRIMARY KEY,
  starboard_id TEXT NOT NULL,
  guild_id     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS autoresponders (
  guild_id TEXT NOT NULL,
  trigger  TEXT NOT NULL,
  response TEXT NOT NULL,
  match_mode TEXT DEFAULT 'contains',
  PRIMARY KEY (guild_id, trigger)
);

CREATE TABLE IF NOT EXISTS badwords (
  guild_id TEXT NOT NULL,
  word     TEXT NOT NULL,
  PRIMARY KEY (guild_id, word)
);

CREATE TABLE IF NOT EXISTS sticky_messages (
  channel_id      TEXT PRIMARY KEY,
  guild_id        TEXT NOT NULL,
  content         TEXT NOT NULL,
  last_message_id TEXT
);

CREATE TABLE IF NOT EXISTS counting (
  channel_id   TEXT PRIMARY KEY,
  guild_id     TEXT NOT NULL,
  current      INTEGER DEFAULT 0,
  last_user_id TEXT,
  best         INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS suggestions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id   TEXT NOT NULL,
  message_id TEXT,
  user_id    TEXT NOT NULL,
  content    TEXT NOT NULL,
  status     TEXT DEFAULT 'pending',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS temp_bans (
  guild_id TEXT NOT NULL,
  user_id  TEXT NOT NULL,
  unban_at INTEGER NOT NULL,
  PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS command_stats (
  command TEXT PRIMARY KEY,
  uses    INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS disabled_commands (
  guild_id TEXT NOT NULL,
  command  TEXT NOT NULL,
  PRIMARY KEY (guild_id, command)
);

CREATE TABLE IF NOT EXISTS log_ignored_channels (
  guild_id   TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  PRIMARY KEY (guild_id, channel_id)
);
-- migrations for older databases are applied below the schema block.

CREATE TABLE IF NOT EXISTS blacklist_users (
  user_id  TEXT PRIMARY KEY,
  reason   TEXT,
  added_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS blacklist_guilds (
  guild_id TEXT PRIMARY KEY,
  reason   TEXT,
  added_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS button_roles (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id   TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  role_id    TEXT NOT NULL,
  label      TEXT NOT NULL,
  emoji      TEXT,
  style      INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS scheduled_messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id    TEXT NOT NULL,
  channel_id  TEXT NOT NULL,
  content     TEXT NOT NULL,
  next_run    INTEGER NOT NULL,
  interval_ms INTEGER DEFAULT 0,
  created_by  TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);
`;
db.exec(SCHEMA);

/* ------------------------------------------------------------------ */
/*  Migrations — add columns introduced after a database already      */
/*  existed. CREATE TABLE IF NOT EXISTS never alters an existing table,*/
/*  so new guild_config columns are added here (idempotent).          */
/* ------------------------------------------------------------------ */
const existingCols = new Set(db.prepare('PRAGMA table_info(guild_config)').all().map((c) => c.name));
const MIGRATIONS = {
  server_log_channel: 'TEXT',
  antiraid_enabled: 'INTEGER DEFAULT 0',
  antiraid_min_age_days: 'INTEGER DEFAULT 0',
  antiraid_action: "TEXT DEFAULT 'kick'",
  antiraid_join_threshold: 'INTEGER DEFAULT 0',
  verify_role: 'TEXT',
  locale: "TEXT DEFAULT 'en'",
};
for (const [col, def] of Object.entries(MIGRATIONS)) {
  if (!existingCols.has(col)) {
    db.exec(`ALTER TABLE guild_config ADD COLUMN ${col} ${def}`);
  }
}
// Column migrations for other tables.
const giveawayCols = new Set(db.prepare('PRAGMA table_info(giveaways)').all().map((c) => c.name));
if (!giveawayCols.has('required_level')) {
  db.exec('ALTER TABLE giveaways ADD COLUMN required_level INTEGER DEFAULT 0');
}

// Rebuild per-guild tables left over from a much older global schema (missing
// guild_id). The current schema keys these on (guild_id, …); a plain ALTER can't
// add a primary-key column, so the old table is renamed aside — preserved as
// <name>_legacy for manual recovery — and recreated from SCHEMA. Tables that
// already have guild_id (modlogs, warnings, guild_config, …) are untouched.
let rebuiltLegacy = false;
for (const table of ['economy', 'inventory', 'shop_items', 'levels', 'level_roles']) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (cols.length && !cols.some((c) => c.name === 'guild_id')) {
    db.exec(`DROP TABLE IF EXISTS ${table}_legacy`);
    db.exec(`ALTER TABLE ${table} RENAME TO ${table}_legacy`);
    rebuiltLegacy = true;
  }
}
if (rebuiltLegacy) db.exec(SCHEMA);

/* ------------------------------------------------------------------ */
/*  Guild config helpers (with in-memory cache)                       */
/* ------------------------------------------------------------------ */
const configCache = new Map();

const insertGuild = db.prepare('INSERT OR IGNORE INTO guild_config (guild_id) VALUES (?)');
const selectGuild = db.prepare('SELECT * FROM guild_config WHERE guild_id = ?');

function getGuildConfig(guildId) {
  if (configCache.has(guildId)) return configCache.get(guildId);
  insertGuild.run(guildId);
  const row = selectGuild.get(guildId);
  configCache.set(guildId, row);
  return row;
}

/** Update one or more columns in guild_config. */
function setGuildConfig(guildId, patch) {
  insertGuild.run(guildId);
  const keys = Object.keys(patch);
  if (!keys.length) return;
  const assignments = keys.map((k) => `${k} = @${k}`).join(', ');
  db.prepare(`UPDATE guild_config SET ${assignments} WHERE guild_id = @guild_id`).run({
    ...patch,
    guild_id: guildId,
  });
  configCache.delete(guildId);
  getGuildConfig(guildId); // refresh cache
}

/* ------------------------------------------------------------------ */
/*  Economy helpers                                                   */
/* ------------------------------------------------------------------ */
const insertEcon = db.prepare(
  'INSERT OR IGNORE INTO economy (guild_id, user_id, wallet) VALUES (?, ?, ?)'
);
const selectEcon = db.prepare('SELECT * FROM economy WHERE guild_id = ? AND user_id = ?');

function getBalance(guildId, userId, startingBalance = 0) {
  insertEcon.run(guildId, userId, startingBalance);
  return selectEcon.get(guildId, userId);
}

function updateBalance(guildId, userId, patch) {
  insertEcon.run(guildId, userId, 0);
  const keys = Object.keys(patch);
  const assignments = keys.map((k) => `${k} = @${k}`).join(', ');
  db.prepare(
    `UPDATE economy SET ${assignments} WHERE guild_id = @guild_id AND user_id = @user_id`
  ).run({ ...patch, guild_id: guildId, user_id: userId });
}

/* ------------------------------------------------------------------ */
/*  Leveling helpers                                                  */
/* ------------------------------------------------------------------ */
const insertLevel = db.prepare(
  'INSERT OR IGNORE INTO levels (guild_id, user_id) VALUES (?, ?)'
);
const selectLevel = db.prepare('SELECT * FROM levels WHERE guild_id = ? AND user_id = ?');

function getLevel(guildId, userId) {
  insertLevel.run(guildId, userId);
  return selectLevel.get(guildId, userId);
}

function setLevel(guildId, userId, patch) {
  insertLevel.run(guildId, userId);
  const keys = Object.keys(patch);
  const assignments = keys.map((k) => `${k} = @${k}`).join(', ');
  db.prepare(
    `UPDATE levels SET ${assignments} WHERE guild_id = @guild_id AND user_id = @user_id`
  ).run({ ...patch, guild_id: guildId, user_id: userId });
}

/* ------------------------------------------------------------------ */
/*  Command stats                                                     */
/* ------------------------------------------------------------------ */
const bumpStat = db.prepare(`
  INSERT INTO command_stats (command, uses) VALUES (?, 1)
  ON CONFLICT(command) DO UPDATE SET uses = uses + 1
`);
function trackCommand(name) {
  try { bumpStat.run(name); } catch { /* ignore */ }
}

/* ------------------------------------------------------------------ */
/*  Log-ignore list (channels excluded from logging)                  */
/* ------------------------------------------------------------------ */
const ignoreLogStmt = db.prepare(
  'INSERT OR IGNORE INTO log_ignored_channels (guild_id, channel_id) VALUES (?, ?)'
);
const unignoreLogStmt = db.prepare(
  'DELETE FROM log_ignored_channels WHERE guild_id = ? AND channel_id = ?'
);
const listIgnoredStmt = db.prepare(
  'SELECT channel_id FROM log_ignored_channels WHERE guild_id = ?'
);
const isIgnoredStmt = db.prepare(
  'SELECT 1 FROM log_ignored_channels WHERE guild_id = ? AND channel_id = ? LIMIT 1'
);

const ignoreLogChannel = (guildId, channelId) => ignoreLogStmt.run(guildId, channelId);
const unignoreLogChannel = (guildId, channelId) => unignoreLogStmt.run(guildId, channelId);
const listIgnoredLogChannels = (guildId) => listIgnoredStmt.all(guildId).map((r) => r.channel_id);

/** True if ANY of the given channel/category ids is on the ignore list. */
function isLogIgnored(guildId, ...channelIds) {
  return channelIds.some((id) => id && isIgnoredStmt.get(guildId, id));
}

/* ------------------------------------------------------------------ */
/*  Blacklists (owner-level bans on users / guilds)                   */
/* ------------------------------------------------------------------ */
const blUserAdd = db.prepare('INSERT OR REPLACE INTO blacklist_users (user_id, reason, added_at) VALUES (?, ?, ?)');
const blUserDel = db.prepare('DELETE FROM blacklist_users WHERE user_id = ?');
const blUserGet = db.prepare('SELECT 1 FROM blacklist_users WHERE user_id = ? LIMIT 1');
const blUserList = db.prepare('SELECT * FROM blacklist_users ORDER BY added_at DESC');
const blGuildAdd = db.prepare('INSERT OR REPLACE INTO blacklist_guilds (guild_id, reason, added_at) VALUES (?, ?, ?)');
const blGuildDel = db.prepare('DELETE FROM blacklist_guilds WHERE guild_id = ?');
const blGuildGet = db.prepare('SELECT 1 FROM blacklist_guilds WHERE guild_id = ? LIMIT 1');
const blGuildList = db.prepare('SELECT * FROM blacklist_guilds ORDER BY added_at DESC');

const blacklistUser = (userId, reason) => blUserAdd.run(userId, reason || null, Date.now());
const unblacklistUser = (userId) => blUserDel.run(userId);
const isUserBlacklisted = (userId) => !!blUserGet.get(userId);
const listBlacklistedUsers = () => blUserList.all();
const blacklistGuild = (guildId, reason) => blGuildAdd.run(guildId, reason || null, Date.now());
const unblacklistGuild = (guildId) => blGuildDel.run(guildId);
const isGuildBlacklisted = (guildId) => !!blGuildGet.get(guildId);
const listBlacklistedGuilds = () => blGuildList.all();

module.exports = {
  db,
  getGuildConfig,
  setGuildConfig,
  getBalance,
  updateBalance,
  getLevel,
  setLevel,
  trackCommand,
  ignoreLogChannel,
  unignoreLogChannel,
  listIgnoredLogChannels,
  isLogIgnored,
  blacklistUser,
  unblacklistUser,
  isUserBlacklisted,
  listBlacklistedUsers,
  blacklistGuild,
  unblacklistGuild,
  isGuildBlacklisted,
  listBlacklistedGuilds,
};
