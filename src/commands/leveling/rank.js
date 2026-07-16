'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db, getLevel, getGuildConfig } = require('../../database/db');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');
const leveling = require('../../utils/leveling');
const { progressBar, formatNumber } = require('../../utils/helpers');

const rankQuery = db.prepare('SELECT COUNT(*) AS rank FROM levels WHERE guild_id = ? AND (total_xp > ? OR (total_xp = ? AND user_id < ?))');

module.exports = {
  category: 'leveling',
  guildOnly: true,
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Show your level and XP rank')
    .addUserOption((o) => o.setName('user').setDescription('Whose rank to show')),
  async execute(interaction) {
    const cfg = getGuildConfig(interaction.guild.id);
    if (!cfg.leveling_enabled) return interaction.reply({ embeds: [Embed.error('Leveling is disabled on this server.')], ephemeral: true });
    const user = interaction.options.getUser('user') || interaction.user;
    const data = getLevel(interaction.guild.id, user.id);
    const needed = leveling.xpForLevel(data.level);
    const rank = rankQuery.get(interaction.guild.id, data.total_xp, data.total_xp, user.id).rank + 1;
    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setAuthor({ name: `${user.username}'s Rank`, iconURL: user.displayAvatarURL() })
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'Level', value: `**${data.level}**`, inline: true },
        { name: 'Rank', value: `**#${rank}**`, inline: true },
        { name: 'Total XP', value: `**${formatNumber(data.total_xp)}**`, inline: true },
        { name: `Progress — ${data.xp} / ${needed} XP`, value: `\`${progressBar(data.xp, needed)}\` ${Math.floor((data.xp / needed) * 100)}%` })
      .setFooter({ text: config.brand.footer });
    return interaction.reply({ embeds: [embed] });
  },
};
