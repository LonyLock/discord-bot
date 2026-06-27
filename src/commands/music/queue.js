'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');
const music = require('../../services/music');

module.exports = {
  category: 'music',
  guildOnly: true,
  data: new SlashCommandBuilder().setName('queue').setDescription('Show the music queue'),
  async execute(interaction, client) {
    const queue = music.getQueue(client, interaction.guild.id);
    if (!queue || (!queue.current && !queue.songs.length)) return interaction.reply({ embeds: [Embed.error('The queue is empty.')], ephemeral: true });
    const upcoming = queue.songs.slice(0, 10).map((s, i) => `**${i + 1}.** ${s.title} \`${s.duration || '?'}\``).join('\n');
    const embed = new EmbedBuilder().setColor(config.brand.color).setTitle('🎵 Music Queue')
      .setDescription(`**Now Playing:**\n${queue.current ? `${queue.current.title} \`${queue.current.duration || '?'}\`` : 'Nothing'}\n\n**Up Next:**\n${upcoming || 'Nothing queued.'}`)
      .setFooter({ text: `${queue.songs.length} song(s) in queue • Loop: ${queue.loop ? 'on' : 'off'}` });
    return interaction.reply({ embeds: [embed] });
  },
};
