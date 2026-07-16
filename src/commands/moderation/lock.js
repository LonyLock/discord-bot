'use strict';
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Embed = require('../../utils/embed');
const { t } = require('../../i18n');

module.exports = {
  category: 'moderation',
  guildOnly: true,
  permissions: [PermissionFlagsBits.ManageChannels],
  botPermissions: [PermissionFlagsBits.ManageRoles],
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock this channel (deny @everyone from sending messages)')
    .addStringOption((o) => o.setName('reason').setDescription('Reason'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  async execute(interaction) {
    const gid = interaction.guild.id;
    const reason = interaction.options.getString('reason') || t(gid, 'mod.no_reason');
    await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false }, { reason });
    return interaction.reply({ embeds: [Embed.success(t(gid, 'mod.lock.success', { reason }))] });
  },
};
