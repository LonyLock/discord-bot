'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../../config.json');

module.exports = {
  category: 'info',
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Show a user\'s avatar in full size')
    .addUserOption((o) => o.setName('user').setDescription('The user')),
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setTitle(`${user.username}'s Avatar`)
      .setDescription(`[PNG](${user.displayAvatarURL({ extension: 'png', size: 1024 })}) • [JPG](${user.displayAvatarURL({ extension: 'jpg', size: 1024 })}) • [WEBP](${user.displayAvatarURL({ extension: 'webp', size: 1024 })})`)
      .setImage(user.displayAvatarURL({ size: 1024 }))
      .setFooter({ text: config.brand.footer });
    return interaction.reply({ embeds: [embed] });
  },
};
