'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');
const { formatNumber } = require('../../utils/helpers');

const listItems = db.prepare('SELECT * FROM shop_items WHERE guild_id = ? ORDER BY price ASC');

module.exports = {
  category: 'economy',
  guildOnly: true,
  data: new SlashCommandBuilder().setName('shop').setDescription('View the server shop'),
  async execute(interaction) {
    const items = listItems.all(interaction.guild.id);
    if (!items.length) return interaction.reply({ embeds: [Embed.info('🛒 Shop', 'The shop is empty. An admin can add items with `/additem`.')] });
    const sym = config.economy.currencySymbol;
    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setTitle(`🛒 ${interaction.guild.name} Shop`)
      .setDescription(items.map((it) =>
        `**#${it.id} • ${it.name}** — ${sym} ${formatNumber(it.price)}\n${it.description || '*No description*'}${it.role_id ? ` (grants <@&${it.role_id}>)` : ''}${it.stock >= 0 ? ` • Stock: ${it.stock}` : ''}`).join('\n\n'))
      .setFooter({ text: 'Buy with /buy <id>' });
    return interaction.reply({ embeds: [embed] });
  },
};
