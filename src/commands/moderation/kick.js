'use strict';
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Embed = require('../../utils/embed');
const { logModAction, checkHierarchy } = require('../../utils/moderation');

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
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ embeds: [Embed.error('That user is not in this server.')], ephemeral: true });
    const hierErr = checkHierarchy(interaction, member);
    if (hierErr) return interaction.reply({ embeds: [Embed.error(hierErr)], ephemeral: true });
    await user.send({ embeds: [Embed.warn(`You were **kicked** from **${interaction.guild.name}**.\nReason: ${reason}`)] }).catch(() => {});
    await member.kick(`${interaction.user.tag}: ${reason}`).catch((e) => { throw e; });
    await logModAction(interaction.guild, { action: 'kick', target: user, moderator: interaction.user, reason });
    return interaction.reply({ embeds: [Embed.success(`**${user.tag}** has been kicked. | ${reason}`)] });
  },
};
