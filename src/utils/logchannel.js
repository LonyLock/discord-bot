'use strict';

const { getGuildConfig } = require('../database/db');

/**
 * Send an embed to a guild's configured log channel (by config column name).
 * `column` may be an array of column names — the first one configured wins, so
 * specific logs (e.g. role_log_channel) can fall back to the broader
 * server_log_channel. Always suppresses mentions so logs never ping anyone.
 * No-ops if unset/missing.
 */
function sendLog(guild, column, embed) {
  if (!guild) return;
  const cfg = getGuildConfig(guild.id);
  const columns = Array.isArray(column) ? column : [column];
  const channelId = columns.map((c) => cfg[c]).find(Boolean);
  if (!channelId) return;
  const channel = guild.channels.cache.get(channelId);
  if (!channel || !channel.isTextBased?.()) return;
  channel.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => {});
}

module.exports = { sendLog };
