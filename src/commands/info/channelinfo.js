'use strict';
const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const config = require('../../../config.json');

const TYPES = { [ChannelType.GuildText]: 'Text', [ChannelType.GuildVoice]: 'Voice', [ChannelType.GuildCategory]: 'Category',
  [ChannelType.GuildAnnouncement]: 'Announcement', [ChannelType.GuildStageVoice]: 'Stage', [ChannelType.GuildForum]: 'Forum' };

module.exports = {
  category: 'info',
  guildOnly: true,
  data: new SlashCommandBuilder()
    .setName('channelinfo')
    .setDescription('Show information about a channel')
    .addChannelOption((o) => o.setName('channel').setDescription('The channel (defaults to current)')),
  async execute(interaction) {
    const ch = interaction.options.getChannel('channel') || interaction.channel;
    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setTitle(`#${ch.name}`)
      .addFields(
        { name: 'ID', value: ch.id, inline: true },
        { name: 'Type', value: TYPES[ch.type] || 'Other', inline: true },
        { name: 'Created', value: `<t:${Math.floor(ch.createdTimestamp / 1000)}:R>`, inline: true })
      .setFooter({ text: config.brand.footer });
    if (ch.topic) embed.setDescription(ch.topic);
    if ('rateLimitPerUser' in ch && ch.rateLimitPerUser) embed.addFields({ name: 'Slowmode', value: `${ch.rateLimitPerUser}s`, inline: true });
    if ('nsfw' in ch) embed.addFields({ name: 'NSFW', value: ch.nsfw ? 'Yes' : 'No', inline: true });
    return interaction.reply({ embeds: [embed] });
  },
};
