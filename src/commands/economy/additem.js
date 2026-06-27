'use strict';
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { db } = require('../../database/db');
const Embed = require('../../utils/embed');

const insertItem = db.prepare('INSERT INTO shop_items (guild_id, name, description, price, role_id, stock) VALUES (?, ?, ?, ?, ?, ?)');

module.exports = {
  category: 'economy',
  guildOnly: true,
  permissions: [PermissionFlagsBits.ManageGuild],
  data: new SlashCommandBuilder()
    .setName('additem')
    .setDescription('Add an item to the server shop (admin)')
    .addStringOption((o) => o.setName('name').setDescription('Item name').setRequired(true).setMaxLength(80))
    .addIntegerOption((o) => o.setName('price').setDescription('Price in coins').setRequired(true).setMinValue(1))
    .addStringOption((o) => o.setName('description').setDescription('Item description'))
    .addRoleOption((o) => o.setName('role').setDescription('Role to grant when purchased'))
    .addIntegerOption((o) => o.setName('stock').setDescription('Limited stock (omit for unlimited)').setMinValue(0))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const name = interaction.options.getString('name');
    const price = interaction.options.getInteger('price');
    const description = interaction.options.getString('description');
    const role = interaction.options.getRole('role');
    const stock = interaction.options.getInteger('stock');
    const res = insertItem.run(interaction.guild.id, name, description, price, role?.id || null, stock ?? -1);
    return interaction.reply({ embeds: [Embed.success(`Added **${name}** to the shop (item #${res.lastInsertRowid}).`)] });
  },
};
