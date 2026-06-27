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
    .setName('pay')
    .setDescription('Give coins to another member')
    .addUserOption((o) => o.setName('user').setDescription('Recipient').setRequired(true))
    .addIntegerOption((o) => o.setName('amount').setDescription('Amount to give').setRequired(true).setMinValue(1)),
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    if (target.bot) return interaction.reply({ embeds: [Embed.error('You cannot pay bots.')], ephemeral: true });
    if (target.id === interaction.user.id) return interaction.reply({ embeds: [Embed.error('You cannot pay yourself.')], ephemeral: true });
    const bal = getBalance(interaction.guild.id, interaction.user.id, config.economy.startingBalance);
    if (amount > bal.wallet) return interaction.reply({ embeds: [Embed.error('You do not have enough in your wallet.')], ephemeral: true });
    const targetBal = getBalance(interaction.guild.id, target.id, config.economy.startingBalance);
    updateBalance(interaction.guild.id, interaction.user.id, { wallet: bal.wallet - amount });
    updateBalance(interaction.guild.id, target.id, { wallet: targetBal.wallet + amount });
    return interaction.reply({ embeds: [Embed.success(`You gave **${config.economy.currencySymbol} ${formatNumber(amount)}** to ${target}.`)] });
  },
};
