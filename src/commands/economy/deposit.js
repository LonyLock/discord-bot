'use strict';
const { SlashCommandBuilder } = require('discord.js');
const { getBalance, updateBalance } = require('../../database/db');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');
const { formatNumber } = require('../../utils/helpers');

module.exports = {
  category: 'economy',
  guildOnly: true,
  data: new SlashCommandBuilder()
    .setName('deposit')
    .setDescription('Deposit coins into your bank')
    .addStringOption((o) => o.setName('amount').setDescription('Amount or "all"').setRequired(true)),
  async execute(interaction) {
    const bal = getBalance(interaction.guild.id, interaction.user.id, config.economy.startingBalance);
    const input = interaction.options.getString('amount').toLowerCase();
    let amount = input === 'all' || input === 'max' ? bal.wallet : parseInt(input.replace(/[^0-9]/g, ''), 10);
    if (!amount || amount <= 0) return interaction.reply({ embeds: [Embed.error('Enter a valid amount.')], ephemeral: true });
    if (amount > bal.wallet) return interaction.reply({ embeds: [Embed.error('You do not have that much in your wallet.')], ephemeral: true });
    updateBalance(interaction.guild.id, interaction.user.id, { wallet: bal.wallet - amount, bank: bal.bank + amount });
    return interaction.reply({ embeds: [Embed.success(`Deposited **${config.economy.currencySymbol} ${formatNumber(amount)}** into your bank.`)] });
  },
};
