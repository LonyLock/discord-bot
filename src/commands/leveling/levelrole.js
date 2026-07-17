'use strict';
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');
const { t } = require('../../i18n');

const setRole = db.prepare('INSERT OR REPLACE INTO level_roles (guild_id, level, role_id) VALUES (?, ?, ?)');
const delRole = db.prepare('DELETE FROM level_roles WHERE guild_id = ? AND level = ?');
const listRoles = db.prepare('SELECT * FROM level_roles WHERE guild_id = ? ORDER BY level ASC');

module.exports = {
  category: 'leveling',
  guildOnly: true,
  permissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [PermissionFlagsBits.ManageRoles],
  data: new SlashCommandBuilder()
    .setName('levelrole')
    .setDescription('Manage level-up role rewards (admin)')
    .addSubcommand((s) => s.setName('set').setDescription('Reward an existing role at a level')
      .addIntegerOption((o) => o.setName('level').setDescription('Level').setRequired(true).setMinValue(1))
      .addRoleOption((o) => o.setName('role').setDescription('Role to grant').setRequired(true)))
    .addSubcommand((s) => s.setName('create').setDescription('Create a brand-new role and reward it at a level')
      .addIntegerOption((o) => o.setName('level').setDescription('Level').setRequired(true).setMinValue(1))
      .addStringOption((o) => o.setName('name').setDescription('Name for the new role').setRequired(true).setMaxLength(100))
      .addStringOption((o) => o.setName('color').setDescription('Hex color, e.g. #E74C3C'))
      .addBooleanOption((o) => o.setName('hoist').setDescription('Show the role separately in the member list')))
    .addSubcommand((s) => s.setName('remove').setDescription('Remove a level reward')
      .addIntegerOption((o) => o.setName('level').setDescription('Level').setRequired(true)))
    .addSubcommand((s) => s.setName('list').setDescription('List all level rewards'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const gid = interaction.guild.id;
    const sub = interaction.options.getSubcommand();
    if (sub === 'create') {
      const level = interaction.options.getInteger('level');
      const name = interaction.options.getString('name');
      const colorInput = interaction.options.getString('color');
      const hoist = interaction.options.getBoolean('hoist') ?? false;
      let color;
      if (colorInput) {
        const hex = colorInput.replace(/^#/, '');
        if (!/^[0-9a-fA-F]{6}$/.test(hex)) return interaction.reply({ embeds: [Embed.error(t(gid, 'lvl.levelrole.bad_color'))], ephemeral: true });
        color = parseInt(hex, 16);
      }
      try {
        const role = await interaction.guild.roles.create({
          name,
          color,
          hoist,
          mentionable: false,
          reason: `Level ${level} reward created by ${interaction.user.tag}`,
        });
        setRole.run(gid, level, role.id);
        return interaction.reply({ embeds: [Embed.success(t(gid, 'lvl.levelrole.created', { role: role.toString(), level }))] });
      } catch {
        return interaction.reply({ embeds: [Embed.error(t(gid, 'lvl.levelrole.create_failed'))], ephemeral: true });
      }
    }
    if (sub === 'set') {
      const level = interaction.options.getInteger('level');
      const role = interaction.options.getRole('role');
      if (role.position >= interaction.guild.members.me.roles.highest.position)
        return interaction.reply({ embeds: [Embed.error(t(gid, 'lvl.levelrole.too_high'))], ephemeral: true });
      setRole.run(gid, level, role.id);
      return interaction.reply({ embeds: [Embed.success(t(gid, 'lvl.levelrole.set', { role: role.toString(), level }))] });
    }
    if (sub === 'remove') {
      const level = interaction.options.getInteger('level');
      const res = delRole.run(gid, level);
      return interaction.reply({ embeds: [res.changes ? Embed.success(t(gid, 'lvl.levelrole.removed', { level })) : Embed.error(t(gid, 'lvl.levelrole.not_set'))] });
    }
    const rows = listRoles.all(gid);
    const embed = new EmbedBuilder().setColor(config.brand.color).setTitle(t(gid, 'lvl.levelrole.list_title'))
      .setDescription(rows.map((r) => t(gid, 'lvl.levelrole.list_entry', { level: r.level, role: r.role_id })).join('\n') || t(gid, 'lvl.levelrole.none'));
    return interaction.reply({ embeds: [embed] });
  },
};
