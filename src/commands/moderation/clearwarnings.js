'use strict';
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Embed = require('../../utils/embed');
const { db } = require('../../database/db');
const { t } = require('../../i18n');

const deleteOne = db.prepare('DELETE FROM warnings WHERE guild_id = ? AND id = ?');
const deleteAll = db.prepare('DELETE FROM warnings WHERE guild_id = ? AND user_id = ?');

module.exports = {
  category: 'moderation',
  guildOnly: true,
  permissions: [PermissionFlagsBits.ModerateMembers],
  data: new SlashCommandBuilder()
    .setName('clearwarnings')
    .setDescription('Clear warnings for a member')
    .addUserOption((o) => o.setName('user').setDescription('The member').setRequired(true))
    .addIntegerOption((o) => o.setName('warning_id').setDescription('Specific warning ID (omit to clear all)'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction) {
    const gid = interaction.guild.id;
    const user = interaction.options.getUser('user');
    const id = interaction.options.getInteger('warning_id');
    if (id) {
      const res = deleteOne.run(gid, id);
      return interaction.reply({ embeds: [res.changes ? Embed.success(t(gid, 'mod.clearwarnings.removed_one', { id })) : Embed.error(t(gid, 'mod.clearwarnings.no_id'))] });
    }
    const res = deleteAll.run(gid, user.id);
    return interaction.reply({ embeds: [Embed.success(t(gid, 'mod.clearwarnings.cleared', { count: res.changes, user: user.tag }))] });
  },
};
