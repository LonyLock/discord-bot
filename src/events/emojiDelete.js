'use strict';

const { Events, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../utils/logchannel');
const config = require('../../config.json');

module.exports = {
  name: Events.GuildEmojiDelete,
  execute(emoji) {
    const embed = new EmbedBuilder()
      .setColor(config.brand.errorColor)
      .setTitle('😶 Emoji Deleted')
      .setDescription(`\`:${emoji.name}:\``)
      .setFooter({ text: `ID: ${emoji.id}` })
      .setTimestamp();
    sendLog(emoji.guild, 'server_log_channel', embed);
  },
};
