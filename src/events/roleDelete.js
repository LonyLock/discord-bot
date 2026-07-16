'use strict';

const { Events, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../utils/logchannel');
const config = require('../../config.json');

module.exports = {
  name: Events.GuildRoleDelete,
  execute(role) {
    const embed = new EmbedBuilder()
      .setColor(config.brand.errorColor)
      .setTitle('🗑️ Role Deleted')
      .setDescription(`**${role.name}**`)
      .setFooter({ text: `ID: ${role.id}` })
      .setTimestamp();
    sendLog(role.guild, 'server_log_channel', embed);
  },
};
