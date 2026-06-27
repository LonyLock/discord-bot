'use strict';
const { SlashCommandBuilder } = require('discord.js');
const Embed = require('../../utils/embed');
const { pick } = require('../../utils/helpers');

module.exports = {
  category: 'fun',
  data: new SlashCommandBuilder()
    .setName('choose')
    .setDescription('Let the bot choose between options')
    .addStringOption((o) => o.setName('options').setDescription('Comma-separated options').setRequired(true)),
  async execute(interaction) {
    const options = interaction.options.getString('options').split(',').map((s) => s.trim()).filter(Boolean);
    if (options.length < 2) return interaction.reply({ embeds: [Embed.error('Provide at least 2 comma-separated options.')], ephemeral: true });
    return interaction.reply({ embeds: [Embed.info('🤔 I choose...', `**${pick(options)}**`)] });
  },
};
