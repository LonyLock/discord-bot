'use strict';

const { Events, EmbedBuilder, ChannelType } = require('discord.js');
const { sendLog } = require('../utils/logchannel');
const config = require('../../config.json');

const TYPES = { [ChannelType.GuildText]: 'Text', [ChannelType.GuildVoice]: 'Voice', [ChannelType.GuildCategory]: 'Category', [ChannelType.GuildAnnouncement]: 'Announcement', [ChannelType.GuildStageVoice]: 'Stage', [ChannelType.GuildForum]: 'Forum' };

module.exports = {
  name: Events.ChannelDelete,
  execute(channel) {
    if (!channel.guild) return;
    const embed = new EmbedBuilder()
      .setColor(config.brand.errorColor)
      .setTitle('🗑️ Channel Deleted')
      .setDescription(`**${channel.name}** (${TYPES[channel.type] || 'Channel'})`)
      .setFooter({ text: `ID: ${channel.id}` })
      .setTimestamp();
    sendLog(channel.guild, 'server_log_channel', embed);
  },
};
