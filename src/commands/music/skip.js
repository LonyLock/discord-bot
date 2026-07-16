'use strict';
const { SlashCommandBuilder } = require('discord.js');
const Embed = require('../../utils/embed');
const music = require('../../services/music');

module.exports = {
  category: 'music',
  guildOnly: true,
  data: new SlashCommandBuilder().setName('skip').setDescription('Skip the current song'),
  async execute(interaction, client) {
    const queue = music.getQueue(client, interaction.guild.id);
    if (!queue || !queue.playing) return interaction.reply({ embeds: [Embed.error('Nothing is playing.')], ephemeral: true });
    if (!interaction.member.voice.channel) return interaction.reply({ embeds: [Embed.error('Join the voice channel first.')], ephemeral: true });
    queue.player.stop(); // triggers Idle -> playNext
    return interaction.reply({ embeds: [Embed.success('⏭️ Skipped.')] });
  },
};
