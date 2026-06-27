'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');
const { parseDuration } = require('../../utils/time');

module.exports = {
  category: 'utility',
  data: new SlashCommandBuilder()
    .setName('timestamp')
    .setDescription('Generate a Discord timestamp')
    .addStringOption((o) => o.setName('in').setDescription('Offset from now, e.g. 2h, 3d (omit for now)')),
  async execute(interaction) {
    const offset = interaction.options.getString('in');
    const ms = offset ? parseDuration(offset) : 0;
    if (offset && ms === null) return interaction.reply({ embeds: [Embed.error('Invalid duration.')], ephemeral: true });
    const ts = Math.floor((Date.now() + (ms || 0)) / 1000);
    const formats = ['t', 'T', 'd', 'D', 'f', 'F', 'R'];
    const embed = new EmbedBuilder().setColor(config.brand.color).setTitle('🕒 Timestamp Generator')
      .setDescription(formats.map((f) => `\`<t:${ts}:${f}>\` → <t:${ts}:${f}>`).join('\n'))
      .setFooter({ text: config.brand.footer });
    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
