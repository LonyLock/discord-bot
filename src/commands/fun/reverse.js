'use strict';
const { SlashCommandBuilder } = require('discord.js');
const Embed = require('../../utils/embed');

module.exports = {
  category: 'fun',
  data: new SlashCommandBuilder()
    .setName('reverse')
    .setDescription('Reverse your text')
    .addStringOption((o) => o.setName('text').setDescription('Text to reverse').setRequired(true)),
  async execute(interaction) {
    return interaction.reply({ embeds: [Embed.info('🔄 Reversed', [...interaction.options.getString('text')].reverse().join(''))] });
  },
};
