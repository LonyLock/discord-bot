'use strict';
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');

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
    const sub = interaction.options.getSubcommand();
    if (sub === 'set') {
      const level = interaction.options.getInteger('level');
      const role = interaction.options.getRole('role');
      if (role.position >= interaction.guild.members.me.roles.highest.position)
        return interaction.reply({ embeds: [Embed.error('That role is higher than mine; I could not assign it.')], ephemeral: true });
      setRole.run(interaction.guild.id, level, role.id);
      return interaction.reply({ embeds: [Embed.success(`Members will now receive ${role} at **level ${level}**.`)] });
    }
    if (sub === 'remove') {
      const level = interaction.options.getInteger('level');
      const res = delRole.run(interaction.guild.id, level);
      return interaction.reply({ embeds: [res.changes ? Embed.success(`Removed the reward for level ${level}.`) : Embed.error('No reward set for that level.')] });
    }
    const rows = listRoles.all(interaction.guild.id);
    const embed = new EmbedBuilder().setColor(config.brand.color).setTitle('🎖️ Level Rewards')
      .setDescription(rows.map((r) => `Level **${r.level}** → <@&${r.role_id}>`).join('\n') || 'No level rewards configured.');
    return interaction.reply({ embeds: [embed] });
  },
};
