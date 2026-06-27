'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');
const config = require('../../../config.json');
const { formatNumber } = require('../../utils/helpers');

const top = db.prepare('SELECT user_id, (wallet + bank) AS total FROM economy WHERE guild_id = ? ORDER BY total DESC LIMIT 10');

module.exports = {
  category: 'economy',
  guildOnly: true,
  data: new SlashCommandBuilder().setName('richest').setDescription('See the richest members on the server'),
  async execute(interaction) {
    const rows = top.all(interaction.guild.id);
    const sym = config.economy.currencySymbol;
    const medals = ['🥇', '🥈', '🥉'];
    const lines = rows.map((r, i) => `${medals[i] || `**${i + 1}.**`} <@${r.user_id}> — ${sym} ${formatNumber(r.total)}`);
    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setTitle(`💰 Richest in ${interaction.guild.name}`)
      .setDescription(lines.join('\n') || 'No data yet.')
      .setFooter({ text: config.brand.footer });
    return interaction.reply({ embeds: [embed] });
  },
};
