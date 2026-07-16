'use strict';

const { Events, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../utils/logchannel');
const config = require('../../config.json');

module.exports = {
  name: Events.GuildRoleCreate,
  execute(role) {
    const embed = new EmbedBuilder()
      .setColor(config.brand.successColor)
      .setTitle('🎭 Role Created')
      .setDescription(`**${role.name}** (${role.hexColor})`)
      .setFooter({ text: `ID: ${role.id}` })
      .setTimestamp();
    sendLog(role.guild, 'server_log_channel', embed);
  },
};
