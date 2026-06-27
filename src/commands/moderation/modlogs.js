'use strict';
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const Embed = require('../../utils/embed');
const { db } = require('../../database/db');
const config = require('../../../config.json');

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
    const user = interaction.options.getUser('user');
    const rows = listLogs.all(interaction.guild.id, user.id);
    if (!rows.length) return interaction.reply({ embeds: [Embed.info('Mod Logs', `No moderation history for **${user.tag}**.`)] });
    const icons = { ban: '🔨', tempban: '⏲️', unban: '♻️', kick: '👢', timeout: '🔇', untimeout: '🔊', warn: '⚠️' };
    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setTitle(`Mod history — ${user.tag}`)
      .setThumbnail(user.displayAvatarURL())
      .setDescription(rows.map((r) => `${icons[r.action] || '•'} **${r.action}** • <t:${Math.floor(r.timestamp / 1000)}:R>\nBy <@${r.moderator_id}> — ${r.reason || 'No reason'}`).join('\n\n'))
      .setFooter({ text: `${rows.length} recent action(s)` });
    return interaction.reply({ embeds: [embed] });
  },
};
