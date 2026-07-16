'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');
const config = require('../../../config.json');
const { formatNumber } = require('../../utils/helpers');
const { t } = require('../../i18n');

const top = db.prepare('SELECT user_id, (wallet + bank) AS total FROM economy WHERE guild_id = ? ORDER BY total DESC LIMIT 10');

module.exports = {
  category: 'economy',
  guildOnly: true,
  data: new SlashCommandBuilder().setName('richest').setDescription('See the richest members on the server'),
  async execute(interaction) {
    const gid = interaction.guild.id;
    const rows = top.all(gid);
    const sym = config.economy.currencySymbol;
    const medals = ['🥇', '🥈', '🥉'];
    const lines = rows.map((r, i) => `${medals[i] || `**${i + 1}.**`} <@${r.user_id}> — ${sym} ${formatNumber(r.total)}`);
    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setTitle(t(gid, 'econ.richest.title', { server: interaction.guild.name }))
      .setDescription(lines.join('\n') || t(gid, 'econ.no_data'))
      .setFooter({ text: config.brand.footer });
    return interaction.reply({ embeds: [embed] });
  },
};
