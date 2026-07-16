'use strict';
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const Embed = require('../../utils/embed');
const { db } = require('../../database/db');
const config = require('../../../config.json');
const { t } = require('../../i18n');

const listLogs = db.prepare('SELECT * FROM modlogs WHERE guild_id = ? AND user_id = ? ORDER BY timestamp DESC LIMIT 20');

module.exports = {
  category: 'moderation',
  guildOnly: true,
  permissions: [PermissionFlagsBits.ModerateMembers],
  data: new SlashCommandBuilder()
    .setName('modlogs')
    .setDescription('View the moderation history of a user')
    .addUserOption((o) => o.setName('user').setDescription('The user').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction) {
    const gid = interaction.guild.id;
    const user = interaction.options.getUser('user');
    const rows = listLogs.all(gid, user.id);
    if (!rows.length) return interaction.reply({ embeds: [Embed.info('Mod Logs', t(gid, 'mod.modlogs.none', { user: user.tag }))] });
    const icons = { ban: '🔨', tempban: '⏲️', unban: '♻️', kick: '👢', timeout: '🔇', untimeout: '🔊', warn: '⚠️' };
    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setTitle(t(gid, 'mod.modlogs.title', { user: user.tag }))
      .setThumbnail(user.displayAvatarURL())
      .setDescription(rows.map((r) => `${icons[r.action] || '•'} **${r.action}** • <t:${Math.floor(r.timestamp / 1000)}:R>\n${t(gid, 'mod.modlogs.entry', { moderator: r.moderator_id, reason: r.reason || t(gid, 'mod.no_reason') })}`).join('\n\n'))
      .setFooter({ text: t(gid, 'mod.modlogs.count', { count: rows.length }) });
    return interaction.reply({ embeds: [embed] });
  },
};
