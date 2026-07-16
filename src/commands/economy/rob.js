'use strict';
const { SlashCommandBuilder } = require('discord.js');
const { getBalance, updateBalance } = require('../../database/db');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');
const { randInt, formatNumber } = require('../../utils/helpers');
const { t } = require('../../i18n');

module.exports = {
  category: 'economy',
  guildOnly: true,
  data: new SlashCommandBuilder()
    .setName('rob')
    .setDescription('Attempt to rob another member\'s wallet')
    .addUserOption((o) => o.setName('user').setDescription('Target to rob').setRequired(true)),
  async execute(interaction) {
    const gid = interaction.guild.id;
    const target = interaction.options.getUser('user');
    if (target.bot || target.id === interaction.user.id)
      return interaction.reply({ embeds: [Embed.error(t(gid, 'econ.rob.invalid_target'))], ephemeral: true });
    const me = getBalance(gid, interaction.user.id, config.economy.startingBalance);
    const now = Date.now();
    const COOLDOWN = 3600000;
    if (now - me.last_rob < COOLDOWN)
      return interaction.reply({ embeds: [Embed.warn(t(gid, 'econ.rob.watched', { next: `<t:${Math.floor((me.last_rob + COOLDOWN) / 1000)}:R>` }))], ephemeral: true });
    const victim = getBalance(gid, target.id, config.economy.startingBalance);
    if (victim.wallet < 100) return interaction.reply({ embeds: [Embed.error(t(gid, 'econ.rob.too_poor'))], ephemeral: true });
    if (me.wallet < 100) return interaction.reply({ embeds: [Embed.error(t(gid, 'econ.rob.need_collateral'))], ephemeral: true });
    const sym = config.economy.currencySymbol;
    if (Math.random() < config.economy.robSuccessRate) {
      const stolen = randInt(Math.floor(victim.wallet * 0.1), Math.floor(victim.wallet * 0.4));
      updateBalance(gid, interaction.user.id, { wallet: me.wallet + stolen, last_rob: now });
      updateBalance(gid, target.id, { wallet: victim.wallet - stolen });
      return interaction.reply({ embeds: [Embed.success(t(gid, 'econ.rob.success', { user: target.toString(), sym, amount: formatNumber(stolen) }))] });
    }
    const penalty = randInt(50, Math.min(me.wallet, 300));
    updateBalance(gid, interaction.user.id, { wallet: me.wallet - penalty, last_rob: now });
    return interaction.reply({ embeds: [Embed.error(t(gid, 'econ.rob.caught', { sym, amount: formatNumber(penalty) }))] });
  },
};
