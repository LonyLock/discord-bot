'use strict';
const { SlashCommandBuilder, EmbedBuilder, version: djsVersion } = require('discord.js');
const { db } = require('../../database/db');
const config = require('../../../config.json');
const { formatDuration } = require('../../utils/time');
const { formatNumber } = require('../../utils/helpers');

const totalCommands = db.prepare('SELECT SUM(uses) AS total FROM command_stats');

module.exports = {
  category: 'info',
  data: new SlashCommandBuilder().setName('botinfo').setDescription('Show information and stats about the bot'),
  async execute(interaction, client) {
    const used = totalCommands.get().total || 0;
    const mem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setAuthor({ name: client.user.tag, iconURL: client.user.displayAvatarURL() })
      .setTitle(`${config.brand.name} — Bot Info`)
      .setThumbnail(client.user.displayAvatarURL())
      .addFields(
        { name: '🏓 Latency', value: `${Math.round(client.ws.ping)}ms`, inline: true },
        { name: '⏱️ Uptime', value: formatDuration(Date.now() - client.startedAt), inline: true },
        { name: '🧠 Memory', value: `${mem} MB`, inline: true },
        { name: '🌐 Servers', value: `${client.guilds.cache.size}`, inline: true },
        { name: '👥 Users', value: `${formatNumber(client.users.cache.size)}`, inline: true },
        { name: '⚡ Commands', value: `${client.commands.size}`, inline: true },
        { name: '📊 Commands Run', value: `${formatNumber(used)}`, inline: true },
        { name: '📚 Library', value: `discord.js v${djsVersion}`, inline: true },
        { name: '🟢 Node', value: process.version, inline: true })
      .setFooter({ text: config.brand.footer })
      .setTimestamp();
    return interaction.reply({ embeds: [embed] });
  },
};
