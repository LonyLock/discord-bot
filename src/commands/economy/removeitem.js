'use strict';
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { db } = require('../../database/db');
const Embed = require('../../utils/embed');
const { t } = require('../../i18n');

const deleteItem = db.prepare('DELETE FROM shop_items WHERE guild_id = ? AND id = ?');

module.exports = {
  category: 'economy',
  guildOnly: true,
  permissions: [PermissionFlagsBits.ManageGuild],
  data: new SlashCommandBuilder()
    .setName('removeitem')
    .setDescription('Remove an item from the shop (admin)')
    .addIntegerOption((o) => o.setName('id').setDescription('Item ID').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const gid = interaction.guild.id;
    const id = interaction.options.getInteger('id');
    const res = deleteItem.run(gid, id);
    return interaction.reply({ embeds: [res.changes ? Embed.success(t(gid, 'econ.removeitem.success', { id })) : Embed.error(t(gid, 'econ.no_item'))] });
  },
};
