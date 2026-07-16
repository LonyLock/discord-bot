'use strict';
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Embed = require('../../utils/embed');
const { logModAction, checkHierarchy } = require('../../utils/moderation');
const { t } = require('../../i18n');

module.exports = {
  category: 'moderation',
  guildOnly: true,
  permissions: [PermissionFlagsBits.KickMembers],
  botPermissions: [PermissionFlagsBits.KickMembers],
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .addUserOption((o) => o.setName('user').setDescription('The user to kick').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason for the kick'))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  async execute(interaction) {
    const gid = interaction.guild.id;
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || t(gid, 'mod.no_reason');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ embeds: [Embed.error(t(gid, 'mod.not_in_server'))], ephemeral: true });
    const hierErr = checkHierarchy(interaction, member);
    if (hierErr) return interaction.reply({ embeds: [Embed.error(hierErr)], ephemeral: true });
    await user.send({ embeds: [Embed.warn(t(gid, 'mod.kick.dm', { server: interaction.guild.name, reason }))] }).catch(() => {});
    await member.kick(`${interaction.user.tag}: ${reason}`).catch((e) => { throw e; });
    await logModAction(interaction.guild, { action: 'kick', target: user, moderator: interaction.user, reason });
    return interaction.reply({ embeds: [Embed.success(t(gid, 'mod.kick.success', { user: user.tag, reason }))] });
  },
};
