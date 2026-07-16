'use strict';
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const Embed = require('../../utils/embed');
const { db } = require('../../database/db');
const config = require('../../../config.json');
const { t } = require('../../i18n');

const listWarn = db.prepare('SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY timestamp DESC');

module.exports = {
  category: 'moderation',
  guildOnly: true,
  permissions: [PermissionFlagsBits.ModerateMembers],
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View a member\'s warnings')
    .addUserOption((o) => o.setName('user').setDescription('The member').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction) {
    const gid = interaction.guild.id;
    const user = interaction.options.getUser('user');
    const rows = listWarn.all(gid, user.id);
    if (!rows.length) return interaction.reply({ embeds: [Embed.info('Warnings', t(gid, 'mod.warnings.none', { user: user.tag }))] });
    const embed = new EmbedBuilder()
      .setColor(config.brand.warnColor)
      .setTitle(t(gid, 'mod.warnings.title', { user: user.tag }))
      .setThumbnail(user.displayAvatarURL())
      .setDescription(rows.slice(0, 15).map((w) =>
        `**#${w.id}** • <t:${Math.floor(w.timestamp / 1000)}:R>\n${t(gid, 'mod.warnings.entry', { moderator: w.moderator_id, reason: w.reason })}`).join('\n\n'))
      .setFooter({ text: t(gid, 'mod.warnings.total', { count: rows.length }) })
      .setTimestamp();
    return interaction.reply({ embeds: [embed] });
  },
};
