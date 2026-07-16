'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');
const { t } = require('../../i18n');

const listInv = db.prepare(`SELECT i.amount, s.name, s.id FROM inventory i JOIN shop_items s ON s.id = i.item_id WHERE i.guild_id = ? AND i.user_id = ? AND i.amount > 0`);

module.exports = {
  category: 'economy',
  guildOnly: true,
  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('View your inventory')
    .addUserOption((o) => o.setName('user').setDescription('Whose inventory')),
  async execute(interaction) {
    const gid = interaction.guild.id;
    const user = interaction.options.getUser('user') || interaction.user;
    const items = listInv.all(gid, user.id);
    if (!items.length) return interaction.reply({ embeds: [Embed.info('🎒 Inventory', t(gid, 'econ.inventory.empty', { user: user.username }))] });
    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setTitle(t(gid, 'econ.inventory.title', { user: user.username }))
      .setDescription(items.map((it) => `**${it.name}** ×${it.amount} (#${it.id})`).join('\n'))
      .setFooter({ text: config.brand.footer });
    return interaction.reply({ embeds: [embed] });
  },
};
