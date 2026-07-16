'use strict';
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Embed = require('../../utils/embed');
const { logModAction } = require('../../utils/moderation');
const { t } = require('../../i18n');

module.exports = {
  category: 'moderation',
  guildOnly: true,
  permissions: [PermissionFlagsBits.BanMembers],
  botPermissions: [PermissionFlagsBits.BanMembers],
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user by their ID')
    .addStringOption((o) => o.setName('user_id').setDescription('The ID of the user to unban').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason for the unban'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  async execute(interaction) {
    const gid = interaction.guild.id;
    const id = interaction.options.getString('user_id');
    const reason = interaction.options.getString('reason') || t(gid, 'mod.no_reason');
    if (!/^\d{16,20}$/.test(id)) return interaction.reply({ embeds: [Embed.error(t(gid, 'mod.unban.invalid_id'))], ephemeral: true });
    const ban = await interaction.guild.bans.fetch(id).catch(() => null);
    if (!ban) return interaction.reply({ embeds: [Embed.error(t(gid, 'mod.unban.not_banned'))], ephemeral: true });
    await interaction.guild.bans.remove(id, `${interaction.user.tag}: ${reason}`).catch(() => {});
    await logModAction(interaction.guild, { action: 'unban', target: ban.user, moderator: interaction.user, reason });
    return interaction.reply({ embeds: [Embed.success(t(gid, 'mod.unban.success', { user: ban.user.tag, reason }))] });
  },
};
