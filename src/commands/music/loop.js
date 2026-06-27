'use strict';
const { SlashCommandBuilder } = require('discord.js');
const Embed = require('../../utils/embed');
const music = require('../../services/music');

module.exports = {
  category: 'music',
  guildOnly: true,
  data: new SlashCommandBuilder().setName('loop').setDescription('Toggle looping of the current song'),
  async execute(interaction, client) {
    const queue = music.getQueue(client, interaction.guild.id);
    if (!queue || !queue.current) return interaction.reply({ embeds: [Embed.error('Nothing is playing.')], ephemeral: true });
    queue.loop = !queue.loop;
    return interaction.reply({ embeds: [Embed.success(`🔁 Loop is now **${queue.loop ? 'on' : 'off'}**.`)] });
  },
};
