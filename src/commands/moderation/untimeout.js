'use strict';
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Embed = require('../../utils/embed');
const { logModAction } = require('../../utils/moderation');

module.exports = {
  category: 'moderation',
  guildOnly: true,
  permissions: [PermissionFlagsBits.ModerateMembers],
  botPermissions: [PermissionFlagsBits.ModerateMembers],
  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Remove a timeout from a member')
    .addUserOption((o) => o.setName('user').setDescription('The member to un-timeout').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ embeds: [Embed.error('That user is not in this server.')], ephemeral: true });
    if (!member.isCommunicationDisabled()) return interaction.reply({ embeds: [Embed.error('That member is not timed out.')], ephemeral: true });
    await member.timeout(null, `${interaction.user.tag}: ${reason}`).catch((e) => { throw e; });
    await logModAction(interaction.guild, { action: 'untimeout', target: user, moderator: interaction.user, reason });
    return interaction.reply({ embeds: [Embed.success(`Timeout removed from **${user.tag}**. | ${reason}`)] });
  },
};
