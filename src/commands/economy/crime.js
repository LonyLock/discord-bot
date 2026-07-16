'use strict';
const { SlashCommandBuilder } = require('discord.js');
const { getBalance, updateBalance } = require('../../database/db');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');
const { randInt, pick, formatNumber } = require('../../utils/helpers');
const { t } = require('../../i18n');

module.exports = {
  category: 'economy',
  guildOnly: true,
  cooldown: 0,
  data: new SlashCommandBuilder().setName('crime').setDescription('Commit a crime for a high-risk, high-reward payout'),
  async execute(interaction) {
    const gid = interaction.guild.id;
    const bal = getBalance(gid, interaction.user.id, config.economy.startingBalance);
    const now = Date.now();
    const COOLDOWN = 1800000;
    if (now - bal.last_crime < COOLDOWN) {
      return interaction.reply({ embeds: [Embed.warn(t(gid, 'econ.crime.laylow', { next: `<t:${Math.floor((bal.last_crime + COOLDOWN) / 1000)}:R>` }))], ephemeral: true });
    }
    const sym = config.economy.currencySymbol;
    if (Math.random() < 0.5) {
      const amt = randInt(200, 600);
      updateBalance(gid, interaction.user.id, { wallet: bal.wallet + amt, last_crime: now });
      const line = pick(t(gid, 'econ.crime.success_lines').split('\n'));
      return interaction.reply({ embeds: [Embed.success(t(gid, 'econ.crime.success', { line, sym, amount: formatNumber(amt) }))] });
    }
    const fine = Math.min(bal.wallet, randInt(150, 400));
    updateBalance(gid, interaction.user.id, { wallet: bal.wallet - fine, last_crime: now });
    const line = pick(t(gid, 'econ.crime.fail_lines').split('\n'));
    return interaction.reply({ embeds: [Embed.error(t(gid, 'econ.crime.fail', { line, sym, amount: formatNumber(fine) }))] });
  },
};
