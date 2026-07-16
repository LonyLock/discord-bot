'use strict';

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { getGuildConfig, setGuildConfig } = require('../../database/db');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');

module.exports = {
  category: 'roles',
  guildOnly: true,
  permissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [PermissionFlagsBits.ManageRoles],
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Member verification gate (admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('role').setDescription('Set the role granted on verification')
      .addRoleOption((o) => o.setName('role').setDescription('Verified role').setRequired(true)))
    .addSubcommand((s) => s.setName('setup').setDescription('Post the verification panel in this channel')
      .addStringOption((o) => o.setName('title').setDescription('Panel title'))
      .addStringOption((o) => o.setName('description').setDescription('Panel description')))
    .addSubcommand((s) => s.setName('status').setDescription('Show the verification configuration')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;

    if (sub === 'role') {
      const role = interaction.options.getRole('role');
      if (role.managed || role.id === gid) return interaction.reply({ embeds: [Embed.error('Pick a normal, assignable role.')], ephemeral: true });
      if (role.position >= interaction.guild.members.me.roles.highest.position)
        return interaction.reply({ embeds: [Embed.error('That role is higher than mine in the hierarchy.')], ephemeral: true });
      setGuildConfig(gid, { verify_role: role.id });
      return interaction.reply({ embeds: [Embed.success(`Verified members will receive ${role}.`)] });
    }

    if (sub === 'setup') {
      const cfg = getGuildConfig(gid);
      if (!cfg.verify_role) return interaction.reply({ embeds: [Embed.error('Set the verified role first with `/verify role`.')], ephemeral: true });
      const embed = new EmbedBuilder()
        .setColor(config.brand.color)
        .setTitle(interaction.options.getString('title') || '✅ Verification')
        .setDescription(interaction.options.getString('description') || 'Click the button below to verify and gain access to the server.')
        .setFooter({ text: config.brand.footer });
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('verify_button').setLabel('Verify').setEmoji('✅').setStyle(ButtonStyle.Success)
      );
      await interaction.channel.send({ embeds: [embed], components: [row] });
      return interaction.reply({ embeds: [Embed.success('Verification panel posted.')], ephemeral: true });
    }

    const cfg = getGuildConfig(gid);
    return interaction.reply({
      embeds: [Embed.info('✅ Verification', `Verified role: ${cfg.verify_role ? `<@&${cfg.verify_role}>` : '`not set`'}\nUse \`/verify role\` then \`/verify setup\`.`)],
      ephemeral: true,
    });
  },
};
