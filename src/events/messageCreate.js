'use strict';

const { Events, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { db, getGuildConfig, getLevel, setLevel } = require('../database/db');
const leveling = require('../utils/leveling');
const config = require('../../config.json');
const { formatDuration } = require('../utils/time');
const { isInvite, isLink, isExcessiveCaps } = require('../utils/patterns');

const getAfk = db.prepare('SELECT * FROM afk WHERE user_id = ?');
const deleteAfk = db.prepare('DELETE FROM afk WHERE user_id = ?');
const getResponders = db.prepare('SELECT * FROM autoresponders WHERE guild_id = ?');
const getBadwords = db.prepare('SELECT word FROM badwords WHERE guild_id = ?');
const getCounting = db.prepare('SELECT * FROM counting WHERE channel_id = ?');
const updateCounting = db.prepare(
  'UPDATE counting SET current = ?, last_user_id = ?, best = ? WHERE channel_id = ?'
);
const getSticky = db.prepare('SELECT * FROM sticky_messages WHERE channel_id = ?');
const updateStickyMsg = db.prepare(
  'UPDATE sticky_messages SET last_message_id = ? WHERE channel_id = ?'
);
const getLevelRoles = db.prepare('SELECT * FROM level_roles WHERE guild_id = ? AND level <= ?');
const getTag = db.prepare('SELECT * FROM tags WHERE guild_id = ? AND name = ?');
const bumpTag = db.prepare('UPDATE tags SET uses = uses + 1 WHERE guild_id = ? AND name = ?');

module.exports = {
  name: Events.MessageCreate,
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;
    const cfg = getGuildConfig(message.guild.id);

    // Order matters: automod can delete before anything else runs.
    if (cfg.automod_enabled) {
      const acted = await runAutomod(message, cfg);
      if (acted) return;
    }

    await handleAfk(message);
    await handleCounting(message, cfg);
    await handleLeveling(message, cfg, client);
    await handleAutoresponders(message, cfg);
    await handleStickyRepost(message);
    await handleLegacyPrefix(message, cfg, client);
  },
};

/* ------------------------------------------------------------------ */
/*  Auto-moderation                                                   */
/* ------------------------------------------------------------------ */
async function runAutomod(message, cfg) {
  // Members with Manage Messages are exempt.
  if (message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) return false;

  const content = message.content;
  let reason = null;

  if (cfg.automod_anti_invite && isInvite(content)) reason = 'Discord invites are not allowed.';
  else if (cfg.automod_anti_link && isLink(content)) reason = 'Links are not allowed here.';
  else if (
    cfg.automod_anti_mention &&
    message.mentions.users.size + message.mentions.roles.size > config.automod.mentionLimit
  ) {
    reason = 'Too many mentions.';
  } else if (cfg.automod_anti_caps && isExcessiveCaps(content)) {
    reason = 'Excessive caps.';
  } else if (cfg.automod_badwords) {
    const words = getBadwords.all(message.guild.id).map((r) => r.word);
    const lower = content.toLowerCase();
    if (words.some((w) => lower.includes(w))) reason = 'Inappropriate language.';
  }

  // Anti-spam (rate based) — uses an in-memory sliding window.
  if (!reason && cfg.automod_anti_spam) {
    const key = `${message.guild.id}:${message.author.id}`;
    const now = Date.now();
    const tracker = message.client.spamTracker;
    const arr = (tracker.get(key) || []).filter(
      (t) => now - t < config.automod.spamIntervalSeconds * 1000
    );
    arr.push(now);
    tracker.set(key, arr);
    if (arr.length >= config.automod.spamMessageThreshold) {
      reason = 'Spamming / sending messages too quickly.';
      tracker.set(key, []);
      // Short timeout to break the spam loop.
      message.member?.timeout(60_000, 'Automod: spam').catch(() => {});
    }
  }

  if (reason) {
    await message.delete().catch(() => {});
    const warn = await message.channel
      .send(`${message.author}, your message was removed: **${reason}**`)
      .catch(() => null);
    if (warn) setTimeout(() => warn.delete().catch(() => {}), 5000);
    return true;
  }
  return false;
}

/* ------------------------------------------------------------------ */
/*  AFK                                                               */
/* ------------------------------------------------------------------ */
async function handleAfk(message) {
  // Clear the author's own AFK.
  const own = getAfk.get(message.author.id);
  if (own && own.guild_id === message.guild.id) {
    deleteAfk.run(message.author.id);
    const back = await message.channel
      .send(`Welcome back ${message.author}, I removed your AFK status. (away for ${formatDuration(Date.now() - own.timestamp)})`)
      .catch(() => null);
    if (back) setTimeout(() => back.delete().catch(() => {}), 8000);
  }
  // Notify about mentioned AFK users.
  if (message.mentions.users.size) {
    const notes = [];
    for (const user of message.mentions.users.values()) {
      const afk = getAfk.get(user.id);
      if (afk && afk.guild_id === message.guild.id && user.id !== message.author.id) {
        notes.push(`**${user.username}** is AFK: ${afk.reason} (${formatDuration(Date.now() - afk.timestamp)} ago)`);
      }
    }
    if (notes.length) message.channel.send(notes.join('\n')).catch(() => {});
  }
}

/* ------------------------------------------------------------------ */
/*  Counting game                                                     */
/* ------------------------------------------------------------------ */
async function handleCounting(message, cfg) {
  const game = getCounting.get(message.channel.id);
  if (!game) return;
  const num = parseInt(message.content.trim(), 10);
  const expected = game.current + 1;
  if (Number.isNaN(num)) return;

  if (num !== expected || message.author.id === game.last_user_id) {
    updateCounting.run(0, null, game.best, message.channel.id);
    await message.react('❌').catch(() => {});
    message.channel
      .send(
        `${message.author} ruined it at **${game.current}**! ${
          num !== expected ? `Expected **${expected}**.` : 'You can\'t count twice in a row.'
        } Starting over from **1**.`
      )
      .catch(() => {});
    return;
  }
  const best = Math.max(game.best, num);
  updateCounting.run(num, message.author.id, best, message.channel.id);
  await message.react(num === best && num > game.best ? '🏅' : '✅').catch(() => {});
}

/* ------------------------------------------------------------------ */
/*  Leveling                                                          */
/* ------------------------------------------------------------------ */
async function handleLeveling(message, cfg, client) {
  if (!cfg.leveling_enabled) return;
  const record = getLevel(message.guild.id, message.author.id);
  const now = Date.now();
  if (now - record.last_message < config.leveling.xpCooldownSeconds * 1000) return;

  const result = leveling.addXp(record, leveling.randomXp());
  setLevel(message.guild.id, message.author.id, {
    xp: result.xp,
    level: result.level,
    total_xp: result.totalXp,
    last_message: now,
  });

  if (result.leveledUp) {
    // Level-up announcement.
    if (cfg.level_up_enabled) {
      const text = (cfg.level_up_message || 'GG {user}, you reached **level {level}**! 🎉')
        .replace(/{user}/g, `${message.author}`)
        .replace(/{level}/g, result.level)
        .replace(/{server}/g, message.guild.name);
      const channel = cfg.level_up_channel
        ? message.guild.channels.cache.get(cfg.level_up_channel)
        : message.channel;
      channel?.send(text).catch(() => {});
    }
    // Level role rewards.
    const roles = getLevelRoles.all(message.guild.id, result.level);
    for (const r of roles) {
      const role = message.guild.roles.cache.get(r.role_id);
      if (role && !message.member.roles.cache.has(role.id)) {
        message.member.roles.add(role, `Reached level ${r.level}`).catch(() => {});
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Auto-responders                                                   */
/* ------------------------------------------------------------------ */
async function handleAutoresponders(message, cfg) {
  const responders = getResponders.all(message.guild.id);
  if (!responders.length) return;
  const lower = message.content.toLowerCase();
  for (const r of responders) {
    const trigger = r.trigger.toLowerCase();
    const hit =
      r.match_mode === 'exact'
        ? lower === trigger
        : r.match_mode === 'startswith'
          ? lower.startsWith(trigger)
          : lower.includes(trigger);
    if (hit) {
      message.channel.send(r.response).catch(() => {});
      break;
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Sticky messages                                                   */
/* ------------------------------------------------------------------ */
async function handleStickyRepost(message) {
  const sticky = getSticky.get(message.channel.id);
  if (!sticky) return;
  // Re-post the sticky note at the bottom, deleting the previous copy.
  if (sticky.last_message_id) {
    message.channel.messages.fetch(sticky.last_message_id).then((m) => m.delete().catch(() => {})).catch(() => {});
  }
  const embed = new EmbedBuilder()
    .setColor(config.brand.color)
    .setDescription(`📌 ${sticky.content}`)
    .setFooter({ text: 'Sticky message' });
  const sent = await message.channel.send({ embeds: [embed] }).catch(() => null);
  if (sent) updateStickyMsg.run(sent.id, message.channel.id);
}

/* ------------------------------------------------------------------ */
/*  Legacy prefix commands (tags + quick aliases)                     */
/* ------------------------------------------------------------------ */
async function handleLegacyPrefix(message, cfg, client) {
  const prefix = cfg.prefix || process.env.DEFAULT_PREFIX || config.defaults.prefix;
  if (!message.content.startsWith(prefix)) return;
  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const name = args.shift()?.toLowerCase();
  if (!name) return;

  // Custom tags created via /tag.
  const tag = getTag.get(message.guild.id, name);
  if (tag) {
    bumpTag.run(message.guild.id, name);
    return message.channel.send(tag.content).catch(() => {});
  }

  // A couple of universally-handy prefix aliases.
  if (name === 'ping') {
    return message.reply(`🏓 Pong! \`${Math.round(client.ws.ping)}ms\``).catch(() => {});
  }
  if (name === 'help') {
    return message.reply('Use the `/help` slash command for the full interactive menu!').catch(() => {});
  }
}
