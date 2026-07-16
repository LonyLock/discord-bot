'use strict';
const { SlashCommandBuilder } = require('discord.js');
const { getBalance, updateBalance, getGuildConfig } = require('../../database/db');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');
const { formatNumber, sleep } = require('../../utils/helpers');
const { spin, spinSymbol, MODES, ROWS } = require('../../utils/slots');
const { t } = require('../../i18n');

const DIVIDER = '━━━━━━━━━━━━━';
const STEP_MS = 650; // delay between reveal frames

/**
 * Render a grid to a string, revealing only the first `locked` columns as their
 * final symbols; any remaining columns are shown mid-spin (fresh random symbols).
 */
function render(grid, locked) {
  const cols = grid[0].length;
  const rows = [];
  for (let r = 0; r < ROWS; r++) {
    const cells = [];
    for (let c = 0; c < cols; c++) {
      cells.push(c < locked ? grid[r][c] : spinSymbol());
    }
    rows.push(cells.join(' '));
  }
  return `${DIVIDER}\n${rows.join('\n')}\n${DIVIDER}`;
}

module.exports = {
  category: 'economy',
  guildOnly: true,
  data: new SlashCommandBuilder()
    .setName('slots')
    .setDescription('Spin the slot machine — pick your bet and grid')
    .addIntegerOption((o) => o.setName('bet').setDescription('Amount to bet').setRequired(true).setMinValue(10))
    .addStringOption((o) => o.setName('mode').setDescription('Grid size to spin')
      .addChoices({ name: '3×3 (steady)', value: '3x3' }, { name: '5×3 (high roller)', value: '5x3' })),
  async execute(interaction) {
    const gid = interaction.guild.id;
    const userId = interaction.user.id;
    const cfg = getGuildConfig(gid);
    if (!cfg.economy_enabled) return interaction.reply({ embeds: [Embed.error(t(gid, 'econ.disabled'))], ephemeral: true });

    const bet = interaction.options.getInteger('bet');
    const mode = MODES[interaction.options.getString('mode')] ? interaction.options.getString('mode') : '3x3';
    const bal = getBalance(gid, userId, config.economy.startingBalance);
    if (bet > bal.wallet) return interaction.reply({ embeds: [Embed.error(t(gid, 'econ.not_enough_coins'))], ephemeral: true });

    const sym = config.economy.currencySymbol;
    const label = mode.replace('x', '×');

    // Resolve the outcome up front, then settle the wallet once so nothing can
    // double-spend if the animation is interrupted.
    const result = spin(mode);
    const winnings = Math.floor(bet * result.multiplier);
    const net = winnings > 0 ? winnings : -bet;
    updateBalance(gid, userId, { wallet: bal.wallet + net });
    const newWallet = bal.wallet + net;

    const header = t(gid, 'econ.slots.header', { mode: label, sym, bet: formatNumber(bet) });
    const frame = (locked, status, color) => Embed.base()
      .setColor(color)
      .setDescription(`${header}\n${render(result.grid, locked)}\n${status}`);

    // Reel-by-reel reveal: columns lock in one at a time, left to right.
    await interaction.reply({ embeds: [frame(0, t(gid, 'econ.slots.spinning'), config.brand.color)] });
    const cols = result.grid[0].length;
    for (let locked = 1; locked <= cols; locked++) {
      await sleep(STEP_MS);
      const final = locked === cols;
      let status = t(gid, 'econ.slots.spinning');
      let color = config.brand.color;
      if (final) {
        color = winnings > 0 ? config.brand.successColor : config.brand.errorColor;
        const line = winnings > 0
          ? t(gid, 'econ.slots.win', { sym, amount: formatNumber(winnings), lines: result.lines.map((l) => `${l.symbol}×${l.count}`).join(' · ') })
          : t(gid, 'econ.slots.lose', { sym, amount: formatNumber(bet) });
        status = `${line}\n${t(gid, 'econ.slots.balance', { sym, balance: formatNumber(newWallet) })}`;
      }
      await interaction.editReply({ embeds: [frame(locked, status, color)] });
    }
  },
};
