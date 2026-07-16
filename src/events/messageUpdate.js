'use strict';

const { Events, EmbedBuilder } = require('discord.js');
const { getGuildConfig, isLogIgnored } = require('../database/db');
const config = require('../../config.json');
const { truncate } = require('../utils/helpers');

module.exports = {
  name: Events.MessageUpdate,
  async execute(oldMessage, newMessage) {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return; // embed loads etc.
    const cfg = getGuildConfig(newMessage.guild.id);
    if (!cfg.message_log_channel) return;
    // Respect the per-guild ignore list (by channel or its parent category).
    if (isLogIgnored(newMessage.guild.id, newMessage.channel.id, newMessage.channel.parentId)) return;
    const channel = newMessage.guild.channels.cache.get(cfg.message_log_channel);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(config.brand.warnColor)
      .setAuthor({
        name: newMessage.author?.tag || 'Unknown',
        iconURL: newMessage.author?.displayAvatarURL(),
      })
      .setTitle('✏️ Message Edited')
      .addFields(
        { name: 'Before', value: truncate(oldMessage.content || '*empty*', 1000) },
        { name: 'After', value: truncate(newMessage.content || '*empty*', 1000) },
        { name: 'Channel', value: `${newMessage.channel} • [Jump](${newMessage.url})` }
      )
      .setFooter({ text: `Author ID: ${newMessage.author?.id || 'unknown'}` })
      .setTimestamp();
    channel.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => {});
  },
};
