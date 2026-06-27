'use strict';
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Embed = require('../../utils/embed');
const { parseDuration, formatDuration } = require('../../utils/time');

module.exports = {
  category: 'moderation',
  guildOnly: true,
  permissions: [PermissionFlagsBits.ManageChannels],
  botPermissions: [PermissionFlagsBits.ManageChannels],
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set the slowmode for this channel')
    .addStringOption((o) =>
      o.setName('duration').setDescription('e.g. 5s, 1m, 1h, or "off" (max 6h)').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  async execute(interaction) {
    const input = interaction.options.getString('duration');
    let seconds;
    if (['off', '0', 'none'].includes(input.toLowerCase())) {
      seconds = 0;
    } else {
      const ms = parseDuration(input);
      if (!ms) return interaction.reply({ embeds: [Embed.error('Invalid duration.')], ephemeral: true });
      seconds = Math.floor(ms / 1000);
    }
    if (seconds > 21600)
      return interaction.reply({ embeds: [Embed.error('Slowmode cannot exceed 6 hours.')], ephemeral: true });
    await interaction.channel.setRateLimitPerUser(seconds, `Set by ${interaction.user.tag}`).catch((e) => { throw e; });
    return interaction.reply({
      embeds: [Embed.success(seconds === 0 ? 'Slowmode disabled.' : `Slowmode set to **${formatDuration(seconds * 1000)}**.`)],
    });
  },
};
