'use strict';
const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { db, getLevel, getGuildConfig } = require('../../database/db');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');
const leveling = require('../../utils/leveling');
const { progressBar, formatNumber } = require('../../utils/helpers');
const rankcard = require('../../services/rankcard');
const { t } = require('../../i18n');

const rankQuery = db.prepare('SELECT COUNT(*) AS rank FROM levels WHERE guild_id = ? AND (total_xp > ? OR (total_xp = ? AND user_id < ?))');

module.exports = {
  category: 'leveling',
  guildOnly: true,
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Show your level and XP rank')
    .addUserOption((o) => o.setName('user').setDescription('Whose rank to show')),
  async execute(interaction) {
    const gid = interaction.guild.id;
    const cfg = getGuildConfig(gid);
    if (!cfg.leveling_enabled) return interaction.reply({ embeds: [Embed.error(t(gid, 'lvl.disabled'))], ephemeral: true });
    const user = interaction.options.getUser('user') || interaction.user;
    const data = getLevel(gid, user.id);
    const needed = leveling.xpForLevel(data.level);
    const rank = rankQuery.get(gid, data.total_xp, data.total_xp, user.id).rank + 1;

    // Preferred: rendered image card. Falls back to an embed if canvas is unavailable.
    if (rankcard.isAvailable()) {
      await interaction.deferReply();
      try {
        const png = await rankcard.generate({
          username: user.username,
          avatarURL: user.displayAvatarURL({ extension: 'png', size: 256 }),
          level: data.level,
          rank,
          xp: data.xp,
          needed,
          accent: config.brand.color,
        });
        if (png) {
          const file = new AttachmentBuilder(png, { name: `rank-${user.id}.png` });
          return interaction.editReply({ files: [file] });
        }
      } catch { /* fall through to embed */ }
    }

    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setAuthor({ name: t(gid, 'lvl.rank.title', { user: user.username }), iconURL: user.displayAvatarURL() })
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: t(gid, 'lvl.rank.level'), value: `**${data.level}**`, inline: true },
        { name: t(gid, 'lvl.rank.rank'), value: `**#${rank}**`, inline: true },
        { name: t(gid, 'lvl.rank.total_xp'), value: `**${formatNumber(data.total_xp)}**`, inline: true },
        { name: t(gid, 'lvl.rank.progress', { xp: data.xp, needed }), value: `\`${progressBar(data.xp, needed)}\` ${Math.floor((data.xp / needed) * 100)}%` })
      .setFooter({ text: config.brand.footer });
    return interaction.deferred || interaction.replied
      ? interaction.editReply({ embeds: [embed] })
      : interaction.reply({ embeds: [embed] });
  },
};
