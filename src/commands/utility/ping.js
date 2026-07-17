'use strict';
const { SlashCommandBuilder } = require('discord.js');
const Embed = require('../../utils/embed');
const { anywhere } = require('../../structures/appcontexts');
const { t } = require('../../i18n');

module.exports = {
  category: 'utility',
  cooldown: 2,
  data: anywhere(new SlashCommandBuilder().setName('ping').setDescription('Check the bot\'s latency')),
  async execute(interaction, client) {
    const gid = interaction.guild?.id;
    const sent = await interaction.reply({ embeds: [Embed.info(t(gid, 'ping.pinging'))], fetchReply: true });
    const rtt = sent.createdTimestamp - interaction.createdTimestamp;
    return interaction.editReply({
      embeds: [Embed.info('🏓 Pong!', t(gid, 'ping.pong', { rtt, ws: Math.round(client.ws.ping) }))],
    });
  },
};
