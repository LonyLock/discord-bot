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
  data: new SlashCommandBuilder().setName('work').setDescription('Work to earn some coins'),
  async execute(interaction) {
    const gid = interaction.guild.id;
    const bal = getBalance(gid, interaction.user.id, config.economy.startingBalance);
    const now = Date.now();
    const COOLDOWN = 3600000;
    if (now - bal.last_work < COOLDOWN) {
      return interaction.reply({ embeds: [Embed.warn(t(gid, 'econ.work.tired', { next: `<t:${Math.floor((bal.last_work + COOLDOWN) / 1000)}:R>` }))], ephemeral: true });
    }
    const earned = randInt(config.economy.workMin, config.economy.workMax);
    updateBalance(gid, interaction.user.id, { wallet: bal.wallet + earned, last_work: now });
    const job = pick(t(gid, 'econ.work.jobs').split('\n'));
    return interaction.reply({ embeds: [Embed.success(t(gid, 'econ.work.result', { job, sym: config.economy.currencySymbol, amount: formatNumber(earned) }))] });
  },
};
