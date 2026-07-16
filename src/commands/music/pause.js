'use strict';
const { SlashCommandBuilder } = require('discord.js');
const Embed = require('../../utils/embed');
const music = require('../../services/music');

module.exports = {
  category: 'music',
  guildOnly: true,
  data: new SlashCommandBuilder().setName('pause').setDescription('Pause or resume playback'),
  async execute(interaction, client) {
    const queue = music.getQueue(client, interaction.guild.id);
    if (!queue || !queue.current) return interaction.reply({ embeds: [Embed.error('Nothing is playing.')], ephemeral: true });
    const { AudioPlayerStatus } = require('@discordjs/voice');
    if (queue.player.state.status === AudioPlayerStatus.Paused) {
      queue.player.unpause();
      return interaction.reply({ embeds: [Embed.success('▶️ Resumed.')] });
    }
    queue.player.pause();
    return interaction.reply({ embeds: [Embed.success('⏸️ Paused.')] });
  },
};
