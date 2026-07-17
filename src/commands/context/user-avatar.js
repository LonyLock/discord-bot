'use strict';

const { ContextMenuCommandBuilder, ApplicationCommandType, EmbedBuilder } = require('discord.js');
const config = require('../../../config.json');

// Right-click a member → Apps → "Avatar".
module.exports = {
  category: 'context',
  data: new ContextMenuCommandBuilder().setName('Avatar').setType(ApplicationCommandType.User),
  async execute(interaction) {
    const user = interaction.targetUser;
    const url = user.displayAvatarURL({ size: 1024 });
    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setTitle(`${user.username}'s avatar`)
      .setURL(url)
      .setImage(url)
      .setFooter({ text: config.brand.footer });
    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
