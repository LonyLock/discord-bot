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
  data: new SlashCommandBuilder()
    .setName('levelrole')
    .setDescription('Manage level-up role rewards (admin)')
    .addSubcommand((s) => s.setName('set').setDescription('Reward a role at a level')
      .addIntegerOption((o) => o.setName('level').setDescription('Level').setRequired(true).setMinValue(1))
      .addRoleOption((o) => o.setName('role').setDescription('Role to grant').setRequired(true)))
    .addSubcommand((s) => s.setName('remove').setDescription('Remove a level reward')
      .addIntegerOption((o) => o.setName('level').setDescription('Level').setRequired(true)))
    .addSubcommand((s) => s.setName('list').setDescription('List all level rewards'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const gid = interaction.guild.id;
    const sub = interaction.options.getSubcommand();
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
