'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');

module.exports = {
  category: 'info',
  guildOnly: true,
  data: new SlashCommandBuilder().setName('servericon').setDescription('Show the server icon'),
  async execute(interaction) {
    const url = interaction.guild.iconURL({ size: 1024 });
    if (!url) return interaction.reply({ embeds: [Embed.error('This server has no icon.')], ephemeral: true });
    const embed = new EmbedBuilder().setColor(config.brand.color).setTitle(`${interaction.guild.name} Icon`).setImage(url).setFooter({ text: config.brand.footer });
    return interaction.reply({ embeds: [embed] });
  },
};
