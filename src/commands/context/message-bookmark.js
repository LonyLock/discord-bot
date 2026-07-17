'use strict';

const { ContextMenuCommandBuilder, ApplicationCommandType, EmbedBuilder } = require('discord.js');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');
const { truncate } = require('../../utils/helpers');
const { anywhere } = require('../../structures/appcontexts');

// Right-click a message → Apps → "Bookmark": DMs the message to you for later.
module.exports = {
  category: 'context',
  data: anywhere(new ContextMenuCommandBuilder().setName('Bookmark').setType(ApplicationCommandType.Message)),
  async execute(interaction) {
    const msg = interaction.targetMessage;
    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
      .setDescription(truncate(msg.content || '*No text content*', 4000))
      .addFields({ name: 'Jump', value: `[Go to message](${msg.url})` })
      .setFooter({ text: '🔖 Bookmark' })
      .setTimestamp(msg.createdTimestamp);
    const image = msg.attachments.find((a) => a.contentType?.startsWith('image'));
    if (image) embed.setImage(image.url);
    try {
      await interaction.user.send({ embeds: [embed] });
      return interaction.reply({ embeds: [Embed.success('Saved to your DMs. 🔖')], ephemeral: true });
    } catch {
      return interaction.reply({ embeds: [Embed.error('I could not DM you — enable direct messages and try again.')], ephemeral: true });
    }
  },
};
