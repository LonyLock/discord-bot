'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');
const { formatNumber } = require('../../utils/helpers');
const { t } = require('../../i18n');

const listItems = db.prepare('SELECT * FROM shop_items WHERE guild_id = ? ORDER BY price ASC');

module.exports = {
  category: 'economy',
  guildOnly: true,
  data: new SlashCommandBuilder().setName('shop').setDescription('View the server shop'),
  async execute(interaction) {
    const gid = interaction.guild.id;
    const items = listItems.all(gid);
    if (!items.length) return interaction.reply({ embeds: [Embed.info('🛒 Shop', t(gid, 'econ.shop.empty'))] });
    const sym = config.economy.currencySymbol;
    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setTitle(t(gid, 'econ.shop.title', { server: interaction.guild.name }))
      .setDescription(items.map((it) =>
        `**#${it.id} • ${it.name}** — ${sym} ${formatNumber(it.price)}\n${it.description || t(gid, 'econ.shop.no_desc')}${it.role_id ? t(gid, 'econ.shop.grants', { role: `<@&${it.role_id}>` }) : ''}${it.stock >= 0 ? t(gid, 'econ.shop.stock', { stock: it.stock }) : ''}`).join('\n\n'))
      .setFooter({ text: t(gid, 'econ.shop.footer') });
    return interaction.reply({ embeds: [embed] });
  },
};
