'use strict';
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const Embed = require('../../utils/embed');
const { db } = require('../../database/db');
const config = require('../../../config.json');

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
    const user = interaction.options.getUser('user');
    const rows = listWarn.all(interaction.guild.id, user.id);
    if (!rows.length) return interaction.reply({ embeds: [Embed.info('Warnings', `**${user.tag}** has no warnings. 🎉`)] });
    const embed = new EmbedBuilder()
      .setColor(config.brand.warnColor)
      .setTitle(`Warnings for ${user.tag}`)
      .setThumbnail(user.displayAvatarURL())
      .setDescription(rows.slice(0, 15).map((w, i) =>
        `**#${w.id}** • <t:${Math.floor(w.timestamp / 1000)}:R>\nBy <@${w.moderator_id}> — ${w.reason}`).join('\n\n'))
      .setFooter({ text: `Total: ${rows.length} warning(s)` })
      .setTimestamp();
    return interaction.reply({ embeds: [embed] });
  },
};
