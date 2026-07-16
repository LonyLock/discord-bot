'use strict';
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Embed = require('../../utils/embed');
const { logModAction, checkHierarchy } = require('../../utils/moderation');
const { parseDuration, formatDuration } = require('../../utils/time');

module.exports = {
  category: 'moderation',
  guildOnly: true,
  permissions: [PermissionFlagsBits.ModerateMembers],
  botPermissions: [PermissionFlagsBits.ModerateMembers],
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout (mute) a member for a duration')
    .addUserOption((o) => o.setName('user').setDescription('The member to timeout').setRequired(true))
    .addStringOption((o) => o.setName('duration').setDescription('e.g. 10m, 1h, 1d (max 28d)').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason for the timeout'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const durationStr = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const ms = parseDuration(durationStr);
    if (!ms || ms < 5000 || ms > 2419200000)
      return interaction.reply({ embeds: [Embed.error('Provide a valid duration between 5s and 28d.')], ephemeral: true });
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ embeds: [Embed.error('That user is not in this server.')], ephemeral: true });
    const hierErr = checkHierarchy(interaction, member);
    if (hierErr) return interaction.reply({ embeds: [Embed.error(hierErr)], ephemeral: true });
    await member.timeout(ms, `${interaction.user.tag}: ${reason}`).catch((e) => { throw e; });
    await logModAction(interaction.guild, { action: 'timeout', target: user, moderator: interaction.user, reason, extra: `Duration: ${formatDuration(ms)}` });
    return interaction.reply({ embeds: [Embed.success(`**${user.tag}** has been timed out for **${formatDuration(ms)}**. | ${reason}`)] });
  },
};
