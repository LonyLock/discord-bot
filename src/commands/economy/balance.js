'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getBalance, getGuildConfig } = require('../../database/db');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');
const { formatNumber } = require('../../utils/helpers');
const { t } = require('../../i18n');

module.exports = {
  category: 'economy',
  guildOnly: true,
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your or someone else\'s balance')
    .addUserOption((o) => o.setName('user').setDescription('Whose balance to check')),
  async execute(interaction) {
    const gid = interaction.guild.id;
    const cfg = getGuildConfig(gid);
    if (!cfg.economy_enabled) return interaction.reply({ embeds: [Embed.error(t(gid, 'econ.disabled'))], ephemeral: true });
    const user = interaction.options.getUser('user') || interaction.user;
    const bal = getBalance(gid, user.id, config.economy.startingBalance);
    const sym = config.economy.currencySymbol;
    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setAuthor({ name: t(gid, 'econ.balance.title', { user: user.username }), iconURL: user.displayAvatarURL() })
      .addFields(
        { name: t(gid, 'econ.field.wallet'), value: `${sym} ${formatNumber(bal.wallet)}`, inline: true },
        { name: t(gid, 'econ.field.bank'), value: `${sym} ${formatNumber(bal.bank)}`, inline: true },
        { name: t(gid, 'econ.field.networth'), value: `${sym} ${formatNumber(bal.wallet + bal.bank)}`, inline: true })
      .setFooter({ text: config.brand.footer });
    return interaction.reply({ embeds: [embed] });
  },
};
