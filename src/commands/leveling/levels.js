'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');
const config = require('../../../config.json');
const { formatNumber } = require('../../utils/helpers');
const { t } = require('../../i18n');

const top = db.prepare('SELECT user_id, level, total_xp FROM levels WHERE guild_id = ? ORDER BY total_xp DESC LIMIT 10');

module.exports = {
  category: 'leveling',
  guildOnly: true,
  data: new SlashCommandBuilder().setName('levels').setDescription('Show the XP leaderboard'),
  async execute(interaction) {
    const gid = interaction.guild.id;
    const rows = top.all(gid);
    const medals = ['🥇', '🥈', '🥉'];
    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setTitle(t(gid, 'lvl.levels.title', { server: interaction.guild.name }))
      .setDescription(rows.map((r, i) => `${medals[i] || `**${i + 1}.**`} <@${r.user_id}> — Level **${r.level}** (${formatNumber(r.total_xp)} XP)`).join('\n') || t(gid, 'lvl.no_data'))
      .setFooter({ text: config.brand.footer });
    return interaction.reply({ embeds: [embed] });
  },
};
