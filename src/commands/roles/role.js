'use strict';
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Embed = require('../../utils/embed');

module.exports = {
  category: 'roles',
  guildOnly: true,
  permissions: [PermissionFlagsBits.ManageRoles],
  botPermissions: [PermissionFlagsBits.ManageRoles],
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Add or remove a role from a member (admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((s) => s.setName('add').setDescription('Add a role')
      .addUserOption((o) => o.setName('user').setDescription('Member').setRequired(true))
      .addRoleOption((o) => o.setName('role').setDescription('Role').setRequired(true)))
    .addSubcommand((s) => s.setName('remove').setDescription('Remove a role')
      .addUserOption((o) => o.setName('user').setDescription('Member').setRequired(true))
      .addRoleOption((o) => o.setName('role').setDescription('Role').setRequired(true))),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const user = interaction.options.getUser('user');
    const role = interaction.options.getRole('role');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ embeds: [Embed.error('That user is not in this server.')], ephemeral: true });
    if (role.managed) return interaction.reply({ embeds: [Embed.error('That role is managed by an integration and cannot be assigned manually.')], ephemeral: true });
    if (role.position >= interaction.guild.members.me.roles.highest.position)
      return interaction.reply({ embeds: [Embed.error('That role is higher than mine in the hierarchy.')], ephemeral: true });
    if (interaction.member.id !== interaction.guild.ownerId && role.position >= interaction.member.roles.highest.position)
      return interaction.reply({ embeds: [Embed.error('That role is higher than or equal to your highest role.')], ephemeral: true });
    if (sub === 'add') {
      if (member.roles.cache.has(role.id)) return interaction.reply({ embeds: [Embed.warn(`${user.tag} already has ${role}.`)], ephemeral: true });
      await member.roles.add(role, `By ${interaction.user.tag}`);
      return interaction.reply({ embeds: [Embed.success(`Added ${role} to ${user}.`)] });
    }
    if (!member.roles.cache.has(role.id)) return interaction.reply({ embeds: [Embed.warn(`${user.tag} doesn't have ${role}.`)], ephemeral: true });
    await member.roles.remove(role, `By ${interaction.user.tag}`);
    return interaction.reply({ embeds: [Embed.success(`Removed ${role} from ${user}.`)] });
  },
};
