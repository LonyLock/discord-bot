'use strict';
const { SlashCommandBuilder } = require('discord.js');
const { getBalance, updateBalance } = require('../../database/db');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');
const { formatNumber } = require('../../utils/helpers');

module.exports = {
  category: 'economy',
  guildOnly: true,
  cooldown: 0,
  data: new SlashCommandBuilder().setName('weekly').setDescription('Claim your weekly reward'),
  async execute(interaction) {
    const bal = getBalance(interaction.guild.id, interaction.user.id, config.economy.startingBalance);
    const now = Date.now();
    const WEEK = 604800000;
    if (now - bal.last_weekly < WEEK) {
      const next = bal.last_weekly + WEEK;
      return interaction.reply({ embeds: [Embed.warn(`Already claimed. Come back <t:${Math.floor(next / 1000)}:R>.`)], ephemeral: true });
    }
    updateBalance(interaction.guild.id, interaction.user.id, { wallet: bal.wallet + config.economy.weeklyAmount, last_weekly: now });
    return interaction.reply({ embeds: [Embed.success(`You claimed your weekly **${config.economy.currencySymbol} ${formatNumber(config.economy.weeklyAmount)}**!`)] });
  },
};
