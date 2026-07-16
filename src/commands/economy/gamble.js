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
    .setName('coinflip')
    .setDescription('Bet on a coin flip — double or nothing')
    .addIntegerOption((o) => o.setName('bet').setDescription('Amount to bet').setRequired(true).setMinValue(10))
    .addStringOption((o) => o.setName('side').setDescription('Heads or tails').setRequired(true)
      .addChoices({ name: 'Heads', value: 'heads' }, { name: 'Tails', value: 'tails' })),
  async execute(interaction) {
    const bet = interaction.options.getInteger('bet');
    const side = interaction.options.getString('side');
    const bal = getBalance(interaction.guild.id, interaction.user.id, config.economy.startingBalance);
    if (bet > bal.wallet) return interaction.reply({ embeds: [Embed.error('You do not have enough coins.')], ephemeral: true });
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const sym = config.economy.currencySymbol;
    if (result === side) {
      updateBalance(interaction.guild.id, interaction.user.id, { wallet: bal.wallet + bet });
      return interaction.reply({ embeds: [Embed.success(`The coin landed on **${result}**! You won **${sym} ${formatNumber(bet)}**! 🎉`)] });
    }
    updateBalance(interaction.guild.id, interaction.user.id, { wallet: bal.wallet - bet });
    return interaction.reply({ embeds: [Embed.error(`The coin landed on **${result}**. You lost **${sym} ${formatNumber(bet)}**.`)] });
  },
};
