'use strict';

const { Events, EmbedBuilder, AuditLogEvent, PermissionFlagsBits } = require('discord.js');
const { sendLog } = require('../utils/logchannel');
const config = require('../../config.json');

module.exports = {
  name: Events.GuildBanRemove,
  async execute(ban, client) {
    const { guild, user } = ban;
    let executor = null;

    if (guild.members.me?.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
      const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanRemove, limit: 5 }).catch(() => null);
      const entry = logs?.entries.find((e) => e.target?.id === user.id);
      if (entry) {
        executor = entry.executor;
        if (executor?.id === client.user.id) return; // already logged by the bot / auto-unban
      }
    }

    const embed = new EmbedBuilder()
      .setColor(config.brand.successColor)
      .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
      .setTitle('♻️ Member Unbanned')
      .addFields(
        { name: 'User', value: `${user.tag} (\`${user.id}\`)`, inline: false },
        { name: 'Moderator', value: executor ? `${executor.tag}` : 'Unknown', inline: true }
      )
      .setTimestamp();
    sendLog(guild, 'mod_log_channel', embed);
  },
};
