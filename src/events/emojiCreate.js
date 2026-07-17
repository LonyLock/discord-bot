'use strict';

const { Events, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../utils/logchannel');
const config = require('../../config.json');

module.exports = {
  name: Events.GuildEmojiCreate,
  execute(emoji) {
    const embed = new EmbedBuilder()
      .setColor(config.brand.successColor)
      .setTitle('😀 Emoji Created')
      .setDescription(`\`:${emoji.name}:\` ${emoji}`)
      .setThumbnail(emoji.imageURL({ size: 128 }))
      .setFooter({ text: `ID: ${emoji.id}` })
      .setTimestamp();
    sendLog(emoji.guild, 'server_log_channel', embed);
  },
};
