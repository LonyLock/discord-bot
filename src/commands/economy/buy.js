'use strict';
const { SlashCommandBuilder } = require('discord.js');
const { db, getBalance, updateBalance } = require('../../database/db');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');
const { formatNumber } = require('../../utils/helpers');

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
    const id = interaction.options.getInteger('id');
    const item = getItem.get(interaction.guild.id, id);
    if (!item) return interaction.reply({ embeds: [Embed.error('No item with that ID.')], ephemeral: true });
    if (item.stock === 0) return interaction.reply({ embeds: [Embed.error('That item is out of stock.')], ephemeral: true });
    const bal = getBalance(interaction.guild.id, interaction.user.id, config.economy.startingBalance);
    if (bal.wallet < item.price) return interaction.reply({ embeds: [Embed.error(`You need ${config.economy.currencySymbol} ${formatNumber(item.price - bal.wallet)} more.`)], ephemeral: true });
    updateBalance(interaction.guild.id, interaction.user.id, { wallet: bal.wallet - item.price });
    if (item.stock > 0) decStock.run(item.id);
    let roleNote = '';
    if (item.role_id) {
      const role = interaction.guild.roles.cache.get(item.role_id);
      if (role && interaction.guild.members.me.roles.highest.comparePositionTo(role) > 0) {
        await interaction.member.roles.add(role, 'Shop purchase').catch(() => {});
        roleNote = ` You received the ${role} role!`;
      }
    } else {
      addInv.run(interaction.guild.id, interaction.user.id, item.id);
    }
    return interaction.reply({ embeds: [Embed.success(`You bought **${item.name}** for ${config.economy.currencySymbol} ${formatNumber(item.price)}.${roleNote}`)] });
  },
};
