'use strict';

const { Events, EmbedBuilder } = require('discord.js');
const { getGuildConfig, isLogIgnored } = require('../database/db');
const config = require('../../config.json');
const { truncate } = require('../utils/helpers');

module.exports = {
  name: Events.MessageDelete,
  async execute(message, client) {
    if (!message.guild || message.author?.bot) return;

    // Cache for /snipe (skip empty messages).
    if (message.content || message.attachments.size) {
      client.snipes.set(message.channel.id, {
        content: message.content,
        author: { tag: message.author?.tag || 'Unknown', avatar: message.author?.displayAvatarURL() },
        image: message.attachments.find((a) => a.contentType?.startsWith('image'))?.url || null,
        time: Date.now(),
      });
      setTimeout(() => client.snipes.delete(message.channel.id), 300000);
    }

    const cfg = getGuildConfig(message.guild.id);
    if (!cfg.message_log_channel) return;
    // Respect the per-guild ignore list (by channel or its parent category).
    if (isLogIgnored(message.guild.id, message.channel.id, message.channel.parentId)) return;
    const channel = message.guild.channels.cache.get(cfg.message_log_channel);
    if (!channel || channel.id === message.channel.id) return;

    const embed = new EmbedBuilder()
      .setColor(config.brand.errorColor)
      .setAuthor({
        name: message.author?.tag || 'Unknown',
        iconURL: message.author?.displayAvatarURL(),
      })
      .setTitle('🗑️ Message Deleted')
      .setDescription(truncate(message.content || '*No text content (embed/attachment)*', 2000))
      .addFields({ name: 'Channel', value: `${message.channel}`, inline: true })
      .setFooter({ text: `Author ID: ${message.author?.id || 'unknown'}` })
      .setTimestamp();
    channel.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => {});
  },
};
