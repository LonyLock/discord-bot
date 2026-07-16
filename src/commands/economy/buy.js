'use strict';
const { SlashCommandBuilder } = require('discord.js');
const { db, getBalance, updateBalance } = require('../../database/db');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');
const { formatNumber } = require('../../utils/helpers');
const { t } = require('../../i18n');

const getItem = db.prepare('SELECT * FROM shop_items WHERE guild_id = ? AND id = ?');
const decStock = db.prepare('UPDATE shop_items SET stock = stock - 1 WHERE id = ? AND stock > 0');
const addInv = db.prepare('INSERT INTO inventory (guild_id, user_id, item_id, amount) VALUES (?, ?, ?, 1) ON CONFLICT(guild_id, user_id, item_id) DO UPDATE SET amount = amount + 1');

module.exports = {
  category: 'economy',
  guildOnly: true,
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Buy an item from the shop')
    .addIntegerOption((o) => o.setName('id').setDescription('Item ID (see /shop)').setRequired(true)),
  async execute(interaction) {
    const gid = interaction.guild.id;
    const sym = config.economy.currencySymbol;
    const id = interaction.options.getInteger('id');
    const item = getItem.get(gid, id);
    if (!item) return interaction.reply({ embeds: [Embed.error(t(gid, 'econ.no_item'))], ephemeral: true });
    if (item.stock === 0) return interaction.reply({ embeds: [Embed.error(t(gid, 'econ.buy.out_of_stock'))], ephemeral: true });
    const bal = getBalance(gid, interaction.user.id, config.economy.startingBalance);
    if (bal.wallet < item.price) return interaction.reply({ embeds: [Embed.error(t(gid, 'econ.buy.need_more', { sym, amount: formatNumber(item.price - bal.wallet) }))], ephemeral: true });
    updateBalance(gid, interaction.user.id, { wallet: bal.wallet - item.price });
    if (item.stock > 0) decStock.run(item.id);
    let roleNote = '';
    if (item.role_id) {
      const role = interaction.guild.roles.cache.get(item.role_id);
      if (role && interaction.guild.members.me.roles.highest.comparePositionTo(role) > 0) {
        await interaction.member.roles.add(role, 'Shop purchase').catch(() => {});
        roleNote = t(gid, 'econ.buy.role_note', { role: role.toString() });
      }
    } else {
      addInv.run(gid, interaction.user.id, item.id);
    }
    return interaction.reply({ embeds: [Embed.success(t(gid, 'econ.buy.success', { name: item.name, sym, price: formatNumber(item.price), roleNote }))] });
  },
};
