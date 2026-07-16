'use strict';

const { getGuildConfig } = require('../database/db');

/**
 * Send an embed to a guild's configured log channel (by config column name).
 * Always suppresses mentions so logs never ping anyone. No-ops if unset/missing.
 */
function sendLog(guild, column, embed) {
  if (!guild) return;
  const cfg = getGuildConfig(guild.id);
  const channelId = cfg[column];
  if (!channelId) return;
  const channel = guild.channels.cache.get(channelId);
  if (!channel || !channel.isTextBased?.()) return;
  channel.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => {});
}

module.exports = { sendLog };
