'use strict';
const { SlashCommandBuilder } = require('discord.js');
const Embed = require('../../utils/embed');

module.exports = {
  category: 'fun',
  data: new SlashCommandBuilder()
    .setName('mock')
    .setDescription('SpOnGeBoB-ify your text')
    .addStringOption((o) => o.setName('text').setDescription('Text to mock').setRequired(true)),
  async execute(interaction) {
    const text = interaction.options.getString('text');
    const mocked = [...text].map((c, i) => (i % 2 ? c.toUpperCase() : c.toLowerCase())).join('');
    return interaction.reply({ embeds: [Embed.info('🧽', mocked)] });
  },
};
