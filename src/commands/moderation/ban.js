'use strict';
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Embed = require('../../utils/embed');
const { logModAction, checkHierarchy } = require('../../utils/moderation');
const { t } = require('../../i18n');

module.exports = {
  category: 'moderation',
  guildOnly: true,
  permissions: [PermissionFlagsBits.BanMembers],
  botPermissions: [PermissionFlagsBits.BanMembers],
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .addUserOption((o) => o.setName('user').setDescription('The user to ban').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason for the ban'))
    .addIntegerOption((o) =>
      o.setName('delete_days').setDescription('Delete this many days of their messages (0-7)').setMinValue(0).setMaxValue(7))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  async execute(interaction) {
    const gid = interaction.guild.id;
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || t(gid, 'mod.no_reason');
    const days = interaction.options.getInteger('delete_days') ?? 0;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    const hierErr = checkHierarchy(interaction, member);
    if (hierErr) return interaction.reply({ embeds: [Embed.error(hierErr)], ephemeral: true });

    await user.send({ embeds: [Embed.error(t(gid, 'mod.ban.dm', { server: interaction.guild.name, reason }))] }).catch(() => {});
    try {
      await interaction.guild.bans.create(user.id, { reason: `${interaction.user.tag}: ${reason}`, deleteMessageSeconds: days * 86400 });
    } catch (e) {
      return interaction.reply({ embeds: [Embed.error(t(gid, 'mod.ban.fail', { error: e.message }))], ephemeral: true });
    }
    await logModAction(interaction.guild, { action: 'ban', target: user, moderator: interaction.user, reason });
    return interaction.reply({ embeds: [Embed.success(t(gid, 'mod.ban.success', { user: user.tag, reason }))] });
  },
};
