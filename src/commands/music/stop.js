'use strict';
const { SlashCommandBuilder } = require('discord.js');
const Embed = require('../../utils/embed');
const music = require('../../services/music');

module.exports = {
  category: 'music',
  guildOnly: true,
  data: new SlashCommandBuilder().setName('stop').setDescription('Stop the music and clear the queue'),
  async execute(interaction, client) {
    const queue = music.getQueue(client, interaction.guild.id);
    if (!queue) return interaction.reply({ embeds: [Embed.error('Nothing is playing.')], ephemeral: true });
    if (!interaction.member.voice.channel) return interaction.reply({ embeds: [Embed.error('Join the voice channel first.')], ephemeral: true });
    queue.songs = [];
    queue.loop = false;
    queue.player.stop();
    queue.connection?.destroy();
    client.musicQueues.delete(interaction.guild.id);
    return interaction.reply({ embeds: [Embed.success('⏹️ Stopped and left the voice channel.')] });
  },
};
