'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');
const music = require('../../services/music');

module.exports = {
  category: 'music',
  guildOnly: true,
  data: new SlashCommandBuilder().setName('nowplaying').setDescription('Show the currently playing song'),
  async execute(interaction, client) {
    const queue = music.getQueue(client, interaction.guild.id);
    if (!queue || !queue.current) return interaction.reply({ embeds: [Embed.error('Nothing is playing.')], ephemeral: true });
    const s = queue.current;
    const embed = new EmbedBuilder().setColor(config.brand.color).setAuthor({ name: '🎶 Now Playing' })
      .setTitle(s.title).setURL(s.url).setThumbnail(s.thumbnail || null)
      .addFields({ name: 'Duration', value: s.duration || 'N/A', inline: true }, { name: 'Requested by', value: s.requestedBy, inline: true });
    return interaction.reply({ embeds: [embed] });
  },
};
