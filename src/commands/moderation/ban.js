'use strict';
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Embed = require('../../utils/embed');
const { logModAction, checkHierarchy } = require('../../utils/moderation');

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
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const days = interaction.options.getInteger('delete_days') ?? 0;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    const hierErr = checkHierarchy(interaction, member);
    if (hierErr) return interaction.reply({ embeds: [Embed.error(hierErr)], ephemeral: true });

    await user.send({ embeds: [Embed.error(`You were **banned** from **${interaction.guild.name}**.\nReason: ${reason}`)] }).catch(() => {});
    try {
      await interaction.guild.bans.create(user.id, { reason: `${interaction.user.tag}: ${reason}`, deleteMessageSeconds: days * 86400 });
    } catch (e) {
      return interaction.reply({ embeds: [Embed.error(`Failed to ban: ${e.message}`)], ephemeral: true });
    }
    await logModAction(interaction.guild, { action: 'ban', target: user, moderator: interaction.user, reason });
    return interaction.reply({ embeds: [Embed.success(`**${user.tag}** has been banned. | ${reason}`)] });
  },
};
