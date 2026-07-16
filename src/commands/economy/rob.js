'use strict';
const { SlashCommandBuilder } = require('discord.js');
const { getBalance, updateBalance } = require('../../database/db');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');
const { randInt, formatNumber } = require('../../utils/helpers');

module.exports = {
  category: 'economy',
  guildOnly: true,
  data: new SlashCommandBuilder()
    .setName('rob')
    .setDescription('Attempt to rob another member\'s wallet')
    .addUserOption((o) => o.setName('user').setDescription('Target to rob').setRequired(true)),
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    if (target.bot || target.id === interaction.user.id)
      return interaction.reply({ embeds: [Embed.error('Invalid target.')], ephemeral: true });
    const me = getBalance(interaction.guild.id, interaction.user.id, config.economy.startingBalance);
    const now = Date.now();
    const COOLDOWN = 3600000;
    if (now - me.last_rob < COOLDOWN)
      return interaction.reply({ embeds: [Embed.warn(`You're being watched. Try again <t:${Math.floor((me.last_rob + COOLDOWN) / 1000)}:R>.`)], ephemeral: true });
    const victim = getBalance(interaction.guild.id, target.id, config.economy.startingBalance);
    if (victim.wallet < 100) return interaction.reply({ embeds: [Embed.error('That person has too little to rob.')], ephemeral: true });
    if (me.wallet < 100) return interaction.reply({ embeds: [Embed.error('You need at least 100 coins to attempt a robbery (collateral).')], ephemeral: true });
    const sym = config.economy.currencySymbol;
    if (Math.random() < config.economy.robSuccessRate) {
      const stolen = randInt(Math.floor(victim.wallet * 0.1), Math.floor(victim.wallet * 0.4));
      updateBalance(interaction.guild.id, interaction.user.id, { wallet: me.wallet + stolen, last_rob: now });
      updateBalance(interaction.guild.id, target.id, { wallet: victim.wallet - stolen });
      return interaction.reply({ embeds: [Embed.success(`You robbed ${target} and stole **${sym} ${formatNumber(stolen)}**!`)] });
    }
    const penalty = randInt(50, Math.min(me.wallet, 300));
    updateBalance(interaction.guild.id, interaction.user.id, { wallet: me.wallet - penalty, last_rob: now });
    return interaction.reply({ embeds: [Embed.error(`You got caught and paid **${sym} ${formatNumber(penalty)}** in fines!`)] });
  },
};
