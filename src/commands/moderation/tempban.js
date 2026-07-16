'use strict';
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Embed = require('../../utils/embed');
const { db } = require('../../database/db');
const { logModAction, checkHierarchy } = require('../../utils/moderation');
const { parseDuration, formatDuration } = require('../../utils/time');

const insertTempBan = db.prepare('INSERT OR REPLACE INTO temp_bans (guild_id, user_id, unban_at) VALUES (?, ?, ?)');

module.exports = {
  category: 'moderation',
  guildOnly: true,
  permissions: [PermissionFlagsBits.BanMembers],
  botPermissions: [PermissionFlagsBits.BanMembers],
  data: new SlashCommandBuilder()
    .setName('tempban')
    .setDescription('Temporarily ban a member; they are auto-unbanned when it expires')
    .addUserOption((o) => o.setName('user').setDescription('The user to ban').setRequired(true))
    .addStringOption((o) => o.setName('duration').setDescription('e.g. 1h, 1d, 7d').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const ms = parseDuration(interaction.options.getString('duration'));
    if (!ms || ms < 60000) return interaction.reply({ embeds: [Embed.error('Provide a valid duration of at least 1 minute.')], ephemeral: true });
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    const hierErr = checkHierarchy(interaction, member);
    if (hierErr) return interaction.reply({ embeds: [Embed.error(hierErr)], ephemeral: true });
    await user.send({ embeds: [Embed.error(`You were **temporarily banned** from **${interaction.guild.name}** for **${formatDuration(ms)}**.\nReason: ${reason}`)] }).catch(() => {});
    await interaction.guild.bans.create(user.id, { reason: `${interaction.user.tag} (temp ${formatDuration(ms)}): ${reason}` }).catch((e) => { throw e; });
    insertTempBan.run(interaction.guild.id, user.id, Date.now() + ms);
    await logModAction(interaction.guild, { action: 'tempban', target: user, moderator: interaction.user, reason, extra: `Duration: ${formatDuration(ms)}` });
    return interaction.reply({ embeds: [Embed.success(`**${user.tag}** has been banned for **${formatDuration(ms)}**. | ${reason}`)] });
  },
};
