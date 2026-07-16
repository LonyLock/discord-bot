'use strict';
const { SlashCommandBuilder } = require('discord.js');
const { getBalance, updateBalance } = require('../../database/db');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');
const { pick, formatNumber } = require('../../utils/helpers');
const { t } = require('../../i18n');

const REELS = ['🍒', '🍋', '🍊', '🍇', '🔔', '💎', '7️⃣'];

module.exports = {
  category: 'economy',
  guildOnly: true,
  data: new SlashCommandBuilder()
    .setName('slots')
    .setDescription('Bet your coins on the slot machine')
    .addIntegerOption((o) => o.setName('bet').setDescription('Amount to bet').setRequired(true).setMinValue(10)),
  async execute(interaction) {
    const gid = interaction.guild.id;
    const bet = interaction.options.getInteger('bet');
    const bal = getBalance(gid, interaction.user.id, config.economy.startingBalance);
    if (bet > bal.wallet) return interaction.reply({ embeds: [Embed.error(t(gid, 'econ.not_enough_coins'))], ephemeral: true });
    const s = [pick(REELS), pick(REELS), pick(REELS)];
    const sym = config.economy.currencySymbol;
    let multiplier = 0;
    if (s[0] === s[1] && s[1] === s[2]) multiplier = s[0] === '💎' ? 10 : s[0] === '7️⃣' ? 7 : 5;
    else if (s[0] === s[1] || s[1] === s[2] || s[0] === s[2]) multiplier = 2;
    const net = multiplier > 0 ? bet * multiplier - bet : -bet;
    updateBalance(gid, interaction.user.id, { wallet: bal.wallet + net });
    const reels = s.join(' | ');
    const embed = multiplier > 0
      ? Embed.success(t(gid, 'econ.slots.win', { reels, sym, amount: formatNumber(bet * multiplier), mult: multiplier }))
      : Embed.error(t(gid, 'econ.slots.lose', { reels, sym, amount: formatNumber(bet) }));
    return interaction.reply({ embeds: [embed] });
  },
};
