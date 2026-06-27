'use strict';
const { SlashCommandBuilder } = require('discord.js');
const Embed = require('../../utils/embed');
const music = require('../../services/music');

module.exports = {
  category: 'music',
  guildOnly: true,
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Set the playback volume (0-200%)')
    .addIntegerOption((o) => o.setName('percent').setDescription('Volume percentage').setRequired(true).setMinValue(0).setMaxValue(200)),
  async execute(interaction, client) {
    const queue = music.getQueue(client, interaction.guild.id);
    if (!queue || !queue.current) return interaction.reply({ embeds: [Embed.error('Nothing is playing.')], ephemeral: true });
    const percent = interaction.options.getInteger('percent');
    queue.volume = percent / 100;
    queue.player.state.resource?.volume?.setVolume(queue.volume);
    return interaction.reply({ embeds: [Embed.success(`🔊 Volume set to **${percent}%**.`)] });
  },
};
