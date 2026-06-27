'use strict';
const { SlashCommandBuilder } = require('discord.js');
const Embed = require('../../utils/embed');

module.exports = {
  category: 'fun',
  data: new SlashCommandBuilder().setName('flip').setDescription('Flip a coin'),
  async execute(interaction) {
    const r = Math.random() < 0.5 ? 'Heads' : 'Tails';
    return interaction.reply({ embeds: [Embed.info('🪙 Coin Flip', `The coin landed on **${r}**! ${r === 'Heads' ? '👑' : '🪙'}`)] });
  },
};
