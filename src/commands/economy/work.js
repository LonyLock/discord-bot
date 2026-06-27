'use strict';
const { SlashCommandBuilder } = require('discord.js');
const { getBalance, updateBalance } = require('../../database/db');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');
const { randInt, pick, formatNumber } = require('../../utils/helpers');

const JOBS = ['You worked as a barista and earned', 'You fixed a bug in production and earned', 'You walked some dogs and earned',
  'You delivered pizzas and earned', 'You streamed for a few hours and earned', 'You mowed lawns and earned',
  'You wrote some code and earned', 'You sold lemonade and earned', 'You did some freelancing and earned'];

module.exports = {
  category: 'economy',
  guildOnly: true,
  cooldown: 0,
  data: new SlashCommandBuilder().setName('work').setDescription('Work to earn some coins'),
  async execute(interaction) {
    const bal = getBalance(interaction.guild.id, interaction.user.id, config.economy.startingBalance);
    const now = Date.now();
    const COOLDOWN = 3600000;
    if (now - bal.last_work < COOLDOWN) {
      return interaction.reply({ embeds: [Embed.warn(`You're tired. Work again <t:${Math.floor((bal.last_work + COOLDOWN) / 1000)}:R>.`)], ephemeral: true });
    }
    const earned = randInt(config.economy.workMin, config.economy.workMax);
    updateBalance(interaction.guild.id, interaction.user.id, { wallet: bal.wallet + earned, last_work: now });
    return interaction.reply({ embeds: [Embed.success(`${pick(JOBS)} **${config.economy.currencySymbol} ${formatNumber(earned)}**!`)] });
  },
};
