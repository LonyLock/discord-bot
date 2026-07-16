'use strict';
const { SlashCommandBuilder } = require('discord.js');
const Embed = require('../../utils/embed');
const { randInt } = require('../../utils/helpers');

module.exports = {
  category: 'fun',
  data: new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Roll dice (e.g. 2d6)')
    .addIntegerOption((o) => o.setName('sides').setDescription('Number of sides (default 6)').setMinValue(2).setMaxValue(1000))
    .addIntegerOption((o) => o.setName('count').setDescription('Number of dice (default 1)').setMinValue(1).setMaxValue(20)),
  async execute(interaction) {
    const sides = interaction.options.getInteger('sides') || 6;
    const count = interaction.options.getInteger('count') || 1;
    const rolls = Array.from({ length: count }, () => randInt(1, sides));
    const total = rolls.reduce((a, b) => a + b, 0);
    return interaction.reply({ embeds: [Embed.info('🎲 Dice Roll', `Rolling **${count}d${sides}**...\n${rolls.join(' + ')}${count > 1 ? ` = **${total}**` : ''}`)] });
  },
};
