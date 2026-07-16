'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');

module.exports = {
  category: 'utility',
  guildOnly: true,
  data: new SlashCommandBuilder().setName('snipe').setDescription('Show the last deleted message in this channel'),
  async execute(interaction, client) {
    const sniped = client.snipes?.get(interaction.channel.id);
    if (!sniped) return interaction.reply({ embeds: [Embed.error('There is nothing to snipe here.')], ephemeral: true });
    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setAuthor({ name: sniped.author.tag, iconURL: sniped.author.avatar })
      .setDescription(sniped.content || '*No text content*')
      .setFooter({ text: 'Deleted message' })
      .setTimestamp(sniped.time);
    if (sniped.image) embed.setImage(sniped.image);
    return interaction.reply({ embeds: [embed] });
  },
};
