'use strict';
const { SlashCommandBuilder } = require('discord.js');
const { getBalance, updateBalance } = require('../../database/db');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');
const { formatNumber } = require('../../utils/helpers');
const { t } = require('../../i18n');

module.exports = {
  category: 'economy',
  guildOnly: true,
  cooldown: 0,
  data: new SlashCommandBuilder().setName('daily').setDescription('Claim your daily reward'),
  async execute(interaction) {
    const gid = interaction.guild.id;
    const bal = getBalance(gid, interaction.user.id, config.economy.startingBalance);
    const now = Date.now();
    const DAY = 86400000;
    if (now - bal.last_daily < DAY) {
      const next = bal.last_daily + DAY;
      return interaction.reply({ embeds: [Embed.warn(t(gid, 'econ.daily.claimed', { next: `<t:${Math.floor(next / 1000)}:R>` }))], ephemeral: true });
    }
    const streak = now - bal.last_daily < DAY * 2 ? bal.streak + 1 : 1;
    const bonus = Math.min(streak * 25, 500);
    const total = config.economy.dailyAmount + bonus;
    updateBalance(gid, interaction.user.id, { wallet: bal.wallet + total, last_daily: now, streak });
    return interaction.reply({ embeds: [Embed.success(t(gid, 'econ.daily.success', { sym: config.economy.currencySymbol, amount: formatNumber(total), streak, bonus }))] });
  },
};
