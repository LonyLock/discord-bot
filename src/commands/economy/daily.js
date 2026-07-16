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
  data: new SlashCommandBuilder().setName('daily').setDescription('Claim your daily reward'),
  async execute(interaction) {
    const bal = getBalance(interaction.guild.id, interaction.user.id, config.economy.startingBalance);
    const now = Date.now();
    const DAY = 86400000;
    if (now - bal.last_daily < DAY) {
      const next = bal.last_daily + DAY;
      return interaction.reply({ embeds: [Embed.warn(`You already claimed your daily. Come back <t:${Math.floor(next / 1000)}:R>.`)], ephemeral: true });
    }
    const streak = now - bal.last_daily < DAY * 2 ? bal.streak + 1 : 1;
    const bonus = Math.min(streak * 25, 500);
    const total = config.economy.dailyAmount + bonus;
    updateBalance(interaction.guild.id, interaction.user.id, { wallet: bal.wallet + total, last_daily: now, streak });
    return interaction.reply({ embeds: [Embed.success(`You claimed your daily **${config.economy.currencySymbol} ${formatNumber(total)}**!\n🔥 Streak: **${streak}** day(s) (+${bonus} bonus)`)] });
  },
};
