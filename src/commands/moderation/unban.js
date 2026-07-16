'use strict';
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Embed = require('../../utils/embed');
const { logModAction } = require('../../utils/moderation');

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
    const id = interaction.options.getString('user_id');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    if (!/^\d{16,20}$/.test(id)) return interaction.reply({ embeds: [Embed.error('That is not a valid user ID.')], ephemeral: true });
    const ban = await interaction.guild.bans.fetch(id).catch(() => null);
    if (!ban) return interaction.reply({ embeds: [Embed.error('That user is not banned.')], ephemeral: true });
    await interaction.guild.bans.remove(id, `${interaction.user.tag}: ${reason}`).catch(() => {});
    await logModAction(interaction.guild, { action: 'unban', target: ban.user, moderator: interaction.user, reason });
    return interaction.reply({ embeds: [Embed.success(`**${ban.user.tag}** has been unbanned. | ${reason}`)] });
  },
};
