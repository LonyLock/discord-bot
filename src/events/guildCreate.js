'use strict';

const { Events } = require('discord.js');
const { getGuildConfig } = require('../database/db');
const logger = require('../utils/logger');

module.exports = {
  name: Events.GuildCreate,
  execute(guild) {
    getGuildConfig(guild.id); // ensure a config row exists
    logger.success(`Joined new guild: ${guild.name} (${guild.id}) — ${guild.memberCount} members.`);
  },
};
