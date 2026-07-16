'use strict';

const { Events, EmbedBuilder, AuditLogEvent, PermissionFlagsBits } = require('discord.js');
const { sendLog } = require('../utils/logchannel');
const config = require('../../config.json');

module.exports = {
  name: Events.GuildBanAdd,
  async execute(ban, client) {
    const { guild, user } = ban;
    let executor = null;
    let reason = ban.reason || null;

    // Look up who banned (and skip if it was the bot itself — the command
    // that issued the ban already wrote a mod-log entry).
    if (guild.members.me?.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
      const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 5 }).catch(() => null);
      const entry = logs?.entries.find((e) => e.target?.id === user.id);
      if (entry) {
        executor = entry.executor;
        reason = reason || entry.reason;
        if (executor?.id === client.user.id) return; // already logged by the bot
      }
    }

    const embed = new EmbedBuilder()
      .setColor(config.brand.errorColor)
      .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
      .setTitle('🔨 Member Banned')
      .addFields(
        { name: 'User', value: `${user.tag} (\`${user.id}\`)`, inline: false },
        { name: 'Moderator', value: executor ? `${executor.tag}` : 'Unknown', inline: true },
        { name: 'Reason', value: reason || 'No reason provided', inline: true }
      )
      .setTimestamp();
    sendLog(guild, 'mod_log_channel', embed);
  },
};
