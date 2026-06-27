'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getBalance, getGuildConfig } = require('../../database/db');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');
const { formatNumber } = require('../../utils/helpers');

module.exports = {
  category: 'economy',
  guildOnly: true,
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your or someone else\'s balance')
    .addUserOption((o) => o.setName('user').setDescription('Whose balance to check')),
  async execute(interaction) {
    const cfg = getGuildConfig(interaction.guild.id);
    if (!cfg.economy_enabled) return interaction.reply({ embeds: [Embed.error('The economy system is disabled here.')], ephemeral: true });
    const user = interaction.options.getUser('user') || interaction.user;
    const bal = getBalance(interaction.guild.id, user.id, config.economy.startingBalance);
    const sym = config.economy.currencySymbol;
    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setAuthor({ name: `${user.username}'s balance`, iconURL: user.displayAvatarURL() })
      .addFields(
        { name: '👛 Wallet', value: `${sym} ${formatNumber(bal.wallet)}`, inline: true },
        { name: '🏦 Bank', value: `${sym} ${formatNumber(bal.bank)}`, inline: true },
        { name: '💰 Net worth', value: `${sym} ${formatNumber(bal.wallet + bal.bank)}`, inline: true })
      .setFooter({ text: config.brand.footer });
    return interaction.reply({ embeds: [embed] });
  },
};
