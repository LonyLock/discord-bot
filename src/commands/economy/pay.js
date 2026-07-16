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
  data: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Give coins to another member')
    .addUserOption((o) => o.setName('user').setDescription('Recipient').setRequired(true))
    .addIntegerOption((o) => o.setName('amount').setDescription('Amount to give').setRequired(true).setMinValue(1)),
  async execute(interaction) {
    const gid = interaction.guild.id;
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    if (target.bot) return interaction.reply({ embeds: [Embed.error(t(gid, 'econ.pay.bots'))], ephemeral: true });
    if (target.id === interaction.user.id) return interaction.reply({ embeds: [Embed.error(t(gid, 'econ.pay.self'))], ephemeral: true });
    const bal = getBalance(gid, interaction.user.id, config.economy.startingBalance);
    if (amount > bal.wallet) return interaction.reply({ embeds: [Embed.error(t(gid, 'econ.not_enough_wallet'))], ephemeral: true });
    const targetBal = getBalance(gid, target.id, config.economy.startingBalance);
    updateBalance(gid, interaction.user.id, { wallet: bal.wallet - amount });
    updateBalance(gid, target.id, { wallet: targetBal.wallet + amount });
    return interaction.reply({ embeds: [Embed.success(t(gid, 'econ.pay.success', { sym: config.economy.currencySymbol, amount: formatNumber(amount), user: target.toString() }))] });
  },
};
