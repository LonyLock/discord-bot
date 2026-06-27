'use strict';
const { SlashCommandBuilder } = require('discord.js');
const Embed = require('../../utils/embed');

module.exports = {
  category: 'utility',
  cooldown: 2,
  data: new SlashCommandBuilder().setName('ping').setDescription('Check the bot\'s latency'),
  async execute(interaction, client) {
    const sent = await interaction.reply({ embeds: [Embed.info('🏓 Pinging...')], fetchReply: true });
    const rtt = sent.createdTimestamp - interaction.createdTimestamp;
    return interaction.editReply({ embeds: [Embed.info('🏓 Pong!', `**Roundtrip:** ${rtt}ms\n**WebSocket:** ${Math.round(client.ws.ping)}ms`)] });
  },
};
