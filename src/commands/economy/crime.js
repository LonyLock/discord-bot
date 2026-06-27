'use strict';
const { SlashCommandBuilder } = require('discord.js');
const { getBalance, updateBalance } = require('../../database/db');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');
const { randInt, pick, formatNumber } = require('../../utils/helpers');

const SUCCESS = ['You robbed a bank and got away with', 'You pulled off a heist and earned', 'You hacked an ATM and grabbed'];
const FAIL = ['You got caught and paid a fine of', 'The police fined you', 'Your plan failed and it cost you'];

module.exports = {
  category: 'economy',
  guildOnly: true,
  cooldown: 0,
  data: new SlashCommandBuilder().setName('crime').setDescription('Commit a crime for a high-risk, high-reward payout'),
  async execute(interaction) {
    const bal = getBalance(interaction.guild.id, interaction.user.id, config.economy.startingBalance);
    const now = Date.now();
    const COOLDOWN = 1800000;
    if (now - bal.last_crime < COOLDOWN) {
      return interaction.reply({ embeds: [Embed.warn(`Lay low for a bit. Try again <t:${Math.floor((bal.last_crime + COOLDOWN) / 1000)}:R>.`)], ephemeral: true });
    }
    const sym = config.economy.currencySymbol;
    if (Math.random() < 0.5) {
      const amt = randInt(200, 600);
      updateBalance(interaction.guild.id, interaction.user.id, { wallet: bal.wallet + amt, last_crime: now });
      return interaction.reply({ embeds: [Embed.success(`${pick(SUCCESS)} **${sym} ${formatNumber(amt)}**!`)] });
    }
    const fine = Math.min(bal.wallet, randInt(150, 400));
    updateBalance(interaction.guild.id, interaction.user.id, { wallet: bal.wallet - fine, last_crime: now });
    return interaction.reply({ embeds: [Embed.error(`${pick(FAIL)} **${sym} ${formatNumber(fine)}**.`)] });
  },
};
